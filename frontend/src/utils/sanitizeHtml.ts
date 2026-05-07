/**
 * Cleans HTML from the Quill rich-text editor before rendering with v-html.
 * Removes invisible break characters, cursor artifacts, hard line-breaks,
 * and non-breaking spaces that cause mid-word wrapping when content is
 * pasted from external sources (Word, web pages, emails, etc.).
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return ''
  return html
    .replace(/<span[^>]*class="ql-cursor"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/[\u200B\u200C\u200D\u00AD\uFEFF]/g, '')
    .replace(/<wbr\s*\/?>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s*style="[^"]*"/gi, '')
}
