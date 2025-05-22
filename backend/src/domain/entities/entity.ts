/**
 * 通用領域實體接口
 * 所有領域實體都應該實現此接口
 */
export interface Entity<T> {
  /**
   * 取得實體的唯一識別碼
   */
  readonly id: string;

  /**
   * 檢查兩個實體是否相等
   * 基於實體的唯一識別碼進行比較
   */
  equals(entity: Entity<T>): boolean;
}

/**
 * 通用值物件接口
 * 值物件是沒有唯一識別碼的領域對象
 */
export interface ValueObject<T> {
  /**
   * 檢查兩個值物件是否相等
   * 基於值物件的所有屬性進行比較
   */
  equals(valueObject: ValueObject<T>): boolean;
}
