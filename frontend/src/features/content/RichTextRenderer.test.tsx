import { render, screen } from '@testing-library/react';
import { RichTextRenderer } from './RichTextRenderer';

describe('RichTextRenderer', () => {
  it('renders allowed rich-text nodes and marks', () => {
    render(
      <RichTextRenderer
        document={{
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Safety update' }] },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Read the ' },
                {
                  type: 'text',
                  text: 'full guidance',
                  marks: [{ type: 'link', attrs: { href: 'https://example.test/guidance' } }],
                },
              ],
            },
            { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keep private details out.' }] }] }] },
          ],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Safety update' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'full guidance' })).toHaveAttribute('href', 'https://example.test/guidance');
    expect(screen.getByText('Keep private details out.')).toBeInTheDocument();
  });

  it('falls back to plain text for legacy content', () => {
    render(<RichTextRenderer document={null} fallbackText="Legacy article body" />);

    expect(screen.getByText('Legacy article body')).toBeInTheDocument();
  });

  it('renders inline article images behind the low-data load action', () => {
    render(
      <RichTextRenderer
        document={{
          type: 'doc',
          content: [{ type: 'articleImage', attrs: { assetId: 7, alt: 'Community meeting notice' } }],
        }}
        assets={[
          {
            id: 7,
            asset_type: 'image',
            original_filename: 'notice.png',
            mime_type: 'image/png',
            file_size: 1200,
            url: '/public/content/1/assets/7/download',
            thumbnail_url: '/public/content/1/assets/7/download',
          },
        ]}
        showMediaAutomatically={false}
        loadedAssets={{}}
        loadMediaLabel="Load media"
      />,
    );

    expect(screen.getByText('notice.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load media' })).toBeInTheDocument();
  });
});
