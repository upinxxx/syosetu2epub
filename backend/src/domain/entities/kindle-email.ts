/**
 * KindleEmail Value Object
 * 驗證和表示Kindle電子郵件地址
 */
export class KindleEmail {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * 創建新的KindleEmail Value Object
   * @param email Kindle電子郵件地址
   */
  public static create(email: string): KindleEmail {
    if (!email || typeof email !== 'string') {
      throw new Error('Kindle電子郵件不能為空');
    }

    const trimmedEmail = email.trim();

    if (!this.isValidKindleEmail(trimmedEmail)) {
      throw new Error(
        '不是有效的Kindle電子郵件地址 (@kindle.com 或 @kindle.amazon.com)',
      );
    }

    return new KindleEmail(trimmedEmail);
  }

  /**
   * 驗證是否為有效的Kindle電子郵件地址
   * @param email 要驗證的電子郵件
   */
  private static isValidKindleEmail(email: string): boolean {
    // 驗證格式為 xxx@kindle.com 或 xxx@kindle.amazon.com
    const kindleEmailRegex = /^[^\s@]+@kindle(\.amazon)?\.com$/;
    return kindleEmailRegex.test(email);
  }

  /**
   * 獲取電子郵件值
   */
  get value(): string {
    return this._value;
  }

  /**
   * 轉為字串
   */
  toString(): string {
    return this._value;
  }

  /**
   * 比較兩個KindleEmail是否相等
   */
  equals(other: KindleEmail): boolean {
    if (!(other instanceof KindleEmail)) {
      return false;
    }

    return this._value === other.value;
  }
}
