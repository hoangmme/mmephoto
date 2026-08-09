import { UICoreMixin } from './pl-ui-core.js?v=300';
import { UIStepsMixin } from './pl-ui-steps.js?v=300';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=300';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=300';
import { UIMediaMixin } from './pl-ui-media.js?v=300';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
