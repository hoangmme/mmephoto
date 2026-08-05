import { UICoreMixin } from './pl-ui-core.js?v=265';
import { UIStepsMixin } from './pl-ui-steps.js?v=265';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=265';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=265';
import { UIMediaMixin } from './pl-ui-media.js?v=265';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
