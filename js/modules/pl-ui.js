import { UICoreMixin } from './pl-ui-core.js?v=287';
import { UIStepsMixin } from './pl-ui-steps.js?v=287';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=287';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=287';
import { UIMediaMixin } from './pl-ui-media.js?v=287';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
