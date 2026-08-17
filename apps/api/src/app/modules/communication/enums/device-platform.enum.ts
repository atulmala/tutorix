import { registerEnumType } from '@nestjs/graphql';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

registerEnumType(DevicePlatform, {
  name: 'DevicePlatform',
});
