import { ReactNode } from 'react';
import { PublicContentAsset, publicAssetUrl, RichTextDocument, RichTextNode } from '../../api';

type Props = {
  document: RichTextDocument | null;
  fallbackText?: string | null;
  assets?: PublicContentAsset[];
  showMediaAutomatically?: boolean;
  loadedAssets?: Record<number, boolean>;
  onLoadAsset?: (assetId: number) => void;
  loadMediaLabel?: string;
};

function safeHref(value: unknown) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:')) {
    return value;
  }
  return null;
}

function applyMarks(children: ReactNode, marks: RichTextNode['marks'], key: string): ReactNode {
  return (marks ?? []).reduce<ReactNode>((current, mark, index) => {
    if (mark.type === 'bold') return <strong key={`${key}-bold-${index}`}>{current}</strong>;
    if (mark.type === 'italic') return <em key={`${key}-italic-${index}`}>{current}</em>;
    if (mark.type === 'underline') return <u key={`${key}-underline-${index}`}>{current}</u>;
    if (mark.type === 'link') {
      const href = safeHref(mark.attrs?.href);
      if (!href) return current;
      return (
        <a key={`${key}-link-${index}`} href={href} className="font-bold text-amani-forest underline">
          {current}
        </a>
      );
    }
    return current;
  }, children);
}

function renderNode(
  node: RichTextNode,
  key: string,
  options: {
    assets: PublicContentAsset[];
    showMediaAutomatically: boolean;
    loadedAssets: Record<number, boolean>;
    onLoadAsset?: (assetId: number) => void;
    loadMediaLabel: string;
  },
): ReactNode {
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`, options));

  if (node.type === 'text') {
    return applyMarks(node.text ?? '', node.marks, key);
  }
  if (node.type === 'paragraph') {
    return (
      <p key={key} className="mt-3 leading-7 text-slate-800">
        {children}
      </p>
    );
  }
  if (node.type === 'heading') {
    return (
      <h3 key={key} className="mt-5 text-lg font-bold text-amani-ink">
        {children}
      </h3>
    );
  }
  if (node.type === 'bulletList') {
    return (
      <ul key={key} className="mt-3 list-disc space-y-2 ps-6 text-slate-800">
        {children}
      </ul>
    );
  }
  if (node.type === 'orderedList') {
    return (
      <ol key={key} className="mt-3 list-decimal space-y-2 ps-6 text-slate-800">
        {children}
      </ol>
    );
  }
  if (node.type === 'listItem') {
    return <li key={key}>{children}</li>;
  }
  if (node.type === 'blockquote') {
    return (
      <blockquote key={key} className="mt-3 border-s-4 border-amani-sun ps-4 leading-7 text-slate-800">
        {children}
      </blockquote>
    );
  }
  if (node.type === 'hardBreak') {
    return <br key={key} />;
  }
  if (node.type === 'articleImage') {
    const assetId = Number(node.attrs?.assetId);
    const asset = options.assets.find((candidate) => candidate.id === assetId && candidate.asset_type === 'image');
    if (!asset) return null;
    const shouldLoad = options.showMediaAutomatically || options.loadedAssets[asset.id];

    return (
      <figure key={key} className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <figcaption className="text-sm font-semibold text-slate-800">{asset.original_filename}</figcaption>
        {shouldLoad && asset.thumbnail_url ? (
          <img
            src={publicAssetUrl(asset.thumbnail_url)}
            alt={typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''}
            loading="lazy"
            className="mt-2 max-h-80 rounded-md border border-slate-200 object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => options.onLoadAsset?.(asset.id)}
            className="mt-2 min-h-11 rounded-md border border-amani-forest px-3 py-2 text-sm font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            {options.loadMediaLabel}
          </button>
        )}
      </figure>
    );
  }
  return null;
}

export function RichTextRenderer({
  document,
  fallbackText,
  assets = [],
  showMediaAutomatically = true,
  loadedAssets = {},
  onLoadAsset,
  loadMediaLabel = 'Load media',
}: Props) {
  if (!document?.content?.length) {
    if (!fallbackText) return null;
    return <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{fallbackText}</p>;
  }

  return (
    <div>
      {document.content.map((node, index) =>
        renderNode(node, `rich-${index}`, { assets, showMediaAutomatically, loadedAssets, onLoadAsset, loadMediaLabel }),
      )}
    </div>
  );
}
