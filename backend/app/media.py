from __future__ import annotations

import hashlib
import secrets
from pathlib import Path

from fastapi import UploadFile

from .errors import ApiError
from .schemas import ContentAssetScanStatus, ContentAssetType
from .settings import settings

ALLOWED_MEDIA: dict[str, tuple[ContentAssetType, tuple[bytes, ...]]] = {
    "image/jpeg": (ContentAssetType.image, (b"\xff\xd8\xff",)),
    "image/png": (ContentAssetType.image, (b"\x89PNG\r\n\x1a\n",)),
    "image/webp": (ContentAssetType.image, (b"RIFF",)),
    "application/pdf": (ContentAssetType.pdf, (b"%PDF",)),
    "video/mp4": (ContentAssetType.video, (b"\x00\x00\x00",)),
    "video/webm": (ContentAssetType.video, (b"\x1aE\xdf\xa3",)),
}

ALLOWED_EXTENSIONS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}


def upload_root() -> Path:
    root = Path(settings.media_upload_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


async def validate_and_store_upload(file: UploadFile) -> dict[str, object]:
    original_filename = Path(file.filename or "upload").name
    extension = Path(original_filename).suffix.lower()
    expected_mime = ALLOWED_EXTENSIONS.get(extension)
    if not expected_mime:
        raise ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "This file type is not allowed.")
    if file.content_type != expected_mime:
        raise ApiError(415, "MIME_TYPE_MISMATCH", "The file type does not match the file extension.")

    content = await file.read()
    if not content:
        raise ApiError(400, "EMPTY_UPLOAD", "The uploaded file is empty.")
    if len(content) > settings.media_max_upload_bytes:
        raise ApiError(413, "UPLOAD_TOO_LARGE", "The uploaded file is too large.")

    asset_type, signatures = ALLOWED_MEDIA[expected_mime]
    if not any(content.startswith(signature) for signature in signatures):
        raise ApiError(415, "FILE_SIGNATURE_MISMATCH", "The file contents do not match the allowed type.")
    if expected_mime == "image/webp" and b"WEBP" not in content[:16]:
        raise ApiError(415, "FILE_SIGNATURE_MISMATCH", "The file contents do not match the allowed type.")
    if expected_mime == "video/mp4" and b"ftyp" not in content[:16]:
        raise ApiError(415, "FILE_SIGNATURE_MISMATCH", "The file contents do not match the allowed type.")

    digest = hashlib.sha256(content).hexdigest()
    stored_filename = f"{secrets.token_urlsafe(24)}{extension}"
    target = upload_root() / stored_filename
    target.write_bytes(content)

    return {
        "asset_type": asset_type,
        "original_filename": original_filename,
        "stored_filename": stored_filename,
        "mime_type": expected_mime,
        "file_size": len(content),
        "sha256_hash": digest,
        "scan_status": ContentAssetScanStatus.clean if settings.media_dev_mark_clean else ContentAssetScanStatus.pending,
    }


def stored_file_path(stored_filename: str) -> Path:
    root = upload_root()
    target = (root / stored_filename).resolve()
    if root not in target.parents and target != root:
        raise ApiError(404, "ASSET_NOT_FOUND", "Asset not found.")
    return target
