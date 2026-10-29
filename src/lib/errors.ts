// 業務錯誤類別。API 層會把它們轉換成合適的 HTTP 狀態碼及中文訊息。

export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "找不到資料") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** JSON 資料檔讀取或寫入失敗 */
export class DataFileError extends Error {
  constructor(
    message: string,
    public fileName: string,
  ) {
    super(message);
    this.name = "DataFileError";
  }
}
