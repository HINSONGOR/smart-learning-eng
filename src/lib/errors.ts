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

/** 未登入（雲端版） */
export class UnauthorizedError extends Error {
  constructor(message = "請先登入") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** 已登入但無權存取（例如嘗試讀取另一位學習者的紀錄） */
export class ForbiddenError extends Error {
  constructor(message = "沒有權限存取這些資料") {
    super(message);
    this.name = "ForbiddenError";
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
