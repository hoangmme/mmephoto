import { UICoreMixin } from './pl-ui-core.js?v=223';
import { UIStepsMixin } from './pl-ui-steps.js?v=223';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=223';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=223';
import { UIMediaMixin } from './pl-ui-media.js?v=223';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
