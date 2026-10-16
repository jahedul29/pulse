export const COVERAGE_FILE_ORIGIN = "https://abapro.s3.eu-north-1.amazonaws.com";
export const COVERAGE_FILE_PROXY_PATH = "/coverage-files";
export const COVERAGE_OBJECT_PATTERN = /^\/[\w-]+\/Media\/coverage\/cities\/[\w.-]+\/tiles\.v\d+\.json$/;

export function coverageObjectUrl(pathname: string, search: string): string | null {
  if (search || !pathname.startsWith(`${COVERAGE_FILE_PROXY_PATH}/`)) return null;
  const objectPath = pathname.slice(COVERAGE_FILE_PROXY_PATH.length);
  return COVERAGE_OBJECT_PATTERN.test(objectPath) ? `${COVERAGE_FILE_ORIGIN}${objectPath}` : null;
}
