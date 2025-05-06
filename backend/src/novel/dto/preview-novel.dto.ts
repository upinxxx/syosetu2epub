import { IsUrl } from 'class-validator';

export class PreviewNovelDto {
  @IsUrl({}, { message: '請輸入合法的小說網址' })
  url: string;
}
