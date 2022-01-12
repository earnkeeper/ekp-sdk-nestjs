import { DocumentDto } from './document.dto';

export interface MilestoneDocumentDto extends DocumentDto {
  readonly label: string;
  readonly status: 'pending' | 'progressing' | 'complete';
}
