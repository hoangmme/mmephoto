import { UICoreMixin } from './pl-ui-core.js?v=307';
import { UIStepsMixin } from './pl-ui-steps.js?v=307';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=307';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=307';
import { UIMediaMixin } from './pl-ui-media.js?v=307';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
