import { mergeAttributes, Node } from '@tiptap/core';

export const ArticleImage = Node.create({
  name: 'articleImage',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      assetId: {
        default: null,
      },
      alt: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-article-image]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        'data-article-image': 'true',
        class: 'rounded-md border border-slate-300 bg-slate-50 p-3',
      }),
      ['figcaption', { class: 'text-sm font-semibold text-slate-700' }, HTMLAttributes.alt || 'Article image'],
    ];
  },
});
