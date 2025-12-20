import { Injectable } from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class AppService {
  getData(): HealthResponseDto {
    return { message: 'Hello API' };
  }
}
