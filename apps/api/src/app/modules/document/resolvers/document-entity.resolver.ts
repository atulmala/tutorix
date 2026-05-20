import { Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentScreeningEntity } from '../entities/document-screening.entity';

@Resolver(() => DocumentEntity)
export class DocumentEntityResolver {
  constructor(
    @InjectRepository(DocumentScreeningEntity)
    private readonly screeningRepo: Repository<DocumentScreeningEntity>,
  ) {}

  @ResolveField('screening', () => DocumentScreeningEntity, {
    nullable: true,
    description: 'AI / human screening status for this document',
  })
  async screening(
    @Parent() doc: DocumentEntity,
  ): Promise<DocumentScreeningEntity | null> {
    if (!doc.id) {
      return null;
    }
    return this.screeningRepo.findOne({
      where: { document: { id: doc.id } },
    });
  }
}
