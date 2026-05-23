export async function runPostprocess(rawContent) {
  if (rawContent.includes('data-postprocessed="true"')) {
    return rawContent;
  }
  return rawContent.replace('<svg ', '<svg data-postprocessed="true" ');
}
