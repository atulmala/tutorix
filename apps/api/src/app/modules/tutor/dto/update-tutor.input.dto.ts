import { InputType, PartialType } from '@nestjs/graphql';
import { CreateTutorInput } from './create-tutor.input.dto';

/**
 * Input type for updating an existing tutor
 * All fields are optional (inherited from PartialType)
 */
@InputType()
export class UpdateTutorInput extends PartialType(CreateTutorInput) {
  // All fields from CreateTutorInput are optional here
  // Can add additional fields if needed for updates
}

