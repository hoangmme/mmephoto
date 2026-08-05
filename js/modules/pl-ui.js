import { UICoreMixin } from './pl-ui-core.js?v=272';
import { UIStepsMixin } from './pl-ui-steps.js?v=272';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=272';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=272';
import { UIMediaMixin } from './pl-ui-media.js?v=272';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
