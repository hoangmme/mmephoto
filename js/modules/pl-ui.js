import { UICoreMixin } from './pl-ui-core.js?v=258';
import { UIStepsMixin } from './pl-ui-steps.js?v=258';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=258';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=258';
import { UIMediaMixin } from './pl-ui-media.js?v=258';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
