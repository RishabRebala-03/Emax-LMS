import React from 'react';

/**
 * Renders a string that may contain HTML (e.g. <img> tags, <table> tags from parsed questions).
 * If the string contains HTML tags, it renders via dangerouslySetInnerHTML.
 * Otherwise, it returns the string as plain text for safety.
 */
export const renderQuestionHtml = (str: string | undefined | null): React.ReactNode => {
  if (!str) return null;
  if (/<(?:img|br|p|span|div|table|thead|tbody|tr|td|th|code|pre|strong|em|b|i|u|sub|sup|ul|ol|li)\b/i.test(str)) {
    return <span dangerouslySetInnerHTML={{ __html: str }} />;
  }
  return str;
};
