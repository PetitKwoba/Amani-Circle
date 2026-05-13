import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { EditorContent, JSONContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicContentAsset, RichTextDocument } from '../../api';
import { ArticleImage } from './articleImageExtension';

const emptyDocument: RichTextDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type Props = {
  value: RichTextDocument | null;
  onChange: (document: RichTextDocument, text: string) => void;
  labelledBy: string;
  imageAssets?: PublicContentAsset[];
};

function toolbarButtonClass(active = false) {
  return `min-h-10 rounded-md border px-3 py-2 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-amani-sun ${
    active ? 'border-amani-forest bg-amani-forest text-white' : 'border-slate-300 bg-white text-slate-900'
  }`;
}

export function RichTextEditor({ value, onChange, labelledBy, imageAssets = [] }: Props) {
  const { t } = useTranslation();
  const [selectedImageAssetId, setSelectedImageAssetId] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      ArticleImage,
      Link.configure({
        autolink: false,
        openOnClick: false,
        protocols: ['http', 'https', 'mailto'],
      }),
    ],
    content: value ?? emptyDocument,
    editorProps: {
      attributes: {
        class:
          'min-h-48 rounded-b-md border-x border-b border-slate-300 bg-white px-4 py-3 leading-7 text-slate-900 focus:outline-none',
        'aria-labelledby': labelledBy,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON() as RichTextDocument, currentEditor.getText({ blockSeparator: '\n' }));
    },
  });

  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value);
    if (current !== next) {
      editor.commands.setContent(value as JSONContent);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700" role="status">
        {t('content.editorLoading')}
      </p>
    );
  }

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt(t('content.linkPrompt'), previousUrl ?? '');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  function insertImage() {
    const asset = imageAssets.find((candidate) => String(candidate.id) === selectedImageAssetId);
    if (!editor || !asset) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'articleImage',
        attrs: {
          assetId: asset.id,
          alt: asset.original_filename,
        },
      })
      .run();
    setSelectedImageAssetId('');
  }

  return (
    <div className="rounded-md">
      <div className="flex flex-wrap gap-2 rounded-t-md border border-slate-300 bg-slate-50 p-2" role="toolbar" aria-label={t('content.editorToolbar')}>
        <button type="button" className={toolbarButtonClass(editor.isActive('paragraph'))} aria-pressed={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
          {t('content.toolbar.paragraph')}
        </button>
        <button type="button" className={toolbarButtonClass(editor.isActive('heading', { level: 2 }))} aria-pressed={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          {t('content.toolbar.heading')}
        </button>
        <button type="button" className={toolbarButtonClass(editor.isActive('bold'))} aria-pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          {t('content.toolbar.bold')}
        </button>
        <button type="button" className={toolbarButtonClass(editor.isActive('italic'))} aria-pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          {t('content.toolbar.italic')}
        </button>
        <button type="button" className={toolbarButtonClass(editor.isActive('underline'))} aria-pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          {t('content.toolbar.underline')}
        </button>
        <button type="button" className={toolbarButtonClass(editor.isActive('bulletList'))} aria-pressed={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          {t('content.toolbar.bullets')}
        </button>
        <button type="button" className={toolbarButtonClass(editor.isActive('orderedList'))} aria-pressed={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          {t('content.toolbar.numbered')}
        </button>
        <button type="button" className={toolbarButtonClass(editor.isActive('blockquote'))} aria-pressed={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          {t('content.toolbar.quote')}
        </button>
        <button type="button" className={toolbarButtonClass(editor.isActive('link'))} aria-pressed={editor.isActive('link')} onClick={setLink}>
          {t('content.toolbar.link')}
        </button>
        {imageAssets.length > 0 && (
          <span className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="article-image-asset">
              {t('content.imageAsset')}
            </label>
            <select
              id="article-image-asset"
              value={selectedImageAssetId}
              onChange={(event) => setSelectedImageAssetId(event.target.value)}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun"
            >
              <option value="">{t('content.chooseImage')}</option>
              {imageAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.original_filename}
                </option>
              ))}
            </select>
            <button type="button" className={toolbarButtonClass()} onClick={insertImage} disabled={!selectedImageAssetId}>
              {t('content.toolbar.image')}
            </button>
          </span>
        )}
        <button type="button" className={toolbarButtonClass()} onClick={() => editor.chain().focus().undo().run()}>
          {t('content.toolbar.undo')}
        </button>
        <button type="button" className={toolbarButtonClass()} onClick={() => editor.chain().focus().redo().run()}>
          {t('content.toolbar.redo')}
        </button>
        <button type="button" className={toolbarButtonClass()} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          {t('content.toolbar.clear')}
        </button>
      </div>
      <EditorContent editor={editor} />
      <p className="mt-2 text-sm leading-6 text-slate-700">{t('content.editorHelp')}</p>
    </div>
  );
}
