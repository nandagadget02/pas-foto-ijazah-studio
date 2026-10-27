const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                    edgeInspectionFocus={edgeInspectionFocus}
                    onSelectEdgeInspectionFocus={setEdgeInspectionFocus}
                  />`;
const targetCRLF = `                    edgeInspectionFocus={edgeInspectionFocus}\r\n                    onSelectEdgeInspectionFocus={setEdgeInspectionFocus}\r\n                  />`;

const rep = `                    edgeInspectionFocus={edgeInspectionFocus}
                    onSelectEdgeInspectionFocus={setEdgeInspectionFocus}
                    bgEngine={selectedBgEngine}
                    onSelectBgEngine={setSelectedBgEngine}
                    onOpenPhotoRoomModal={() => setIsPhotoRoomModalOpen(true)}
                    onProcessWithPhotoRoom={handleProcessWithPhotoRoom}
                    isProcessingPhotoRoom={isProcessingPhotoRoom}
                    hasPhotoRoomKey={Boolean(photoRoomApiKey)}
                    isPhotoRoomMaskActive={isPhotoRoomMaskActive}
                    onResetPhotoRoomMask={handleResetPhotoRoomMask}
                    photoRoomError={photoRoomError}
                  />`;

if (code.includes(targetCRLF)) {
  code = code.replace(targetCRLF, rep);
  fs.writeFileSync('src/App.tsx', code, 'utf8');
  console.log('App.tsx props updated with CRLF');
} else if (code.includes(target)) {
  code = code.replace(target, rep);
  fs.writeFileSync('src/App.tsx', code, 'utf8');
  console.log('App.tsx props updated with LF');
} else {
  console.log('Target pattern not found in App.tsx');
}
