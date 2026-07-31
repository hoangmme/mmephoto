import { UICoreMixin } from './pl-ui-core.js?v=224';
import { UIStepsMixin } from './pl-ui-steps.js?v=224';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=224';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=224';
import { UIMediaMixin } from './pl-ui-media.js?v=224';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
