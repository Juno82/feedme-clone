export interface ConvertSuccess {
  url: string;
  title?: string;
  author?: string;
  markdown: string;
}

export type ConvertErrorKind = "fetch_failed" | "extract_failed";

export interface ConvertError {
  kind: ConvertErrorKind;
  message: string;
}

export type ConvertResponse = ConvertSuccess | ConvertError;

export function isConvertError(response: ConvertResponse): response is ConvertError {
  return "kind" in response;
}
