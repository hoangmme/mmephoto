import { UICoreMixin } from './pl-ui-core.js?v=259';
import { UIStepsMixin } from './pl-ui-steps.js?v=259';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=259';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=259';
import { UIMediaMixin } from './pl-ui-media.js?v=259';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
