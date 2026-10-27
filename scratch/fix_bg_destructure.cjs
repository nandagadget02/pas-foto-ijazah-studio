const fs = require('fs');
let code = fs.readFileSync('src/components/BackgroundSelector.tsx', 'utf8');
const search = 'onSelectEdgeInspectionFocus,\n}) => {';
const searchCRLF = 'onSelectEdgeInspectionFocus,\r\n}) => {';

const rep = `onSelectEdgeInspectionFocus,
  bgEngine = 'local',
  onSelectBgEngine,
  onOpenPhotoRoomModal,
  onProcessWithPhotoRoom,
  isProcessingPhotoRoom = false,
  hasPhotoRoomKey = false,
  isPhotoRoomMaskActive = false,
  onResetPhotoRoomMask,
  photoRoomError = null,
}) => {`;

if (code.includes(searchCRLF)) {
  code = code.replace(searchCRLF, rep);
  fs.writeFileSync('src/components/BackgroundSelector.tsx', code, 'utf8');
  console.log('Replaced with CRLF');
} else if (code.includes(search)) {
  code = code.replace(search, rep);
  fs.writeFileSync('src/components/BackgroundSelector.tsx', code, 'utf8');
  console.log('Replaced with LF');
} else {
  console.log('Pattern not found in BackgroundSelector.tsx');
}
