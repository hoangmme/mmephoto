import { UICoreMixin } from './pl-ui-core.js?v=253';
import { UIStepsMixin } from './pl-ui-steps.js?v=253';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=253';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=253';
import { UIMediaMixin } from './pl-ui-media.js?v=253';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
