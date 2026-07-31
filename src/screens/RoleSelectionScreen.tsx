// Compatibility export for older imports. Production routing now uses verified
// memberships; users never choose an authoritative role manually.
export {
  WorkspaceSelectionScreen as RoleSelectionScreen,
} from './auth/WorkspaceSelectionScreen';
