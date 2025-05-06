import { Controller } from '@nestjs/common';
import { EpubService } from './epub.service.js';

@Controller('epub')
export class EpubController {
  constructor(private readonly epubService: EpubService) {}
}
