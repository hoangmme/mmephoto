import re

with open('server.js', 'r') as f:
    content = f.read()

replacement = """
  if (step !== undefined) sessionObj.step = step;
  if (currentTemplate !== undefined) sessionObj.currentTemplate = currentTemplate;
  
  // SAFEGUARD: Do not accept empty slots or empty selectedImages if we are at step >= 2, 
  // because that means a client accidentally wiped them out.
  const targetStep = sessionObj.step || 1;
  if (selectedImages !== undefined) {
      if (targetStep >= 2 && selectedImages.length === 0 && sessionObj.selectedImages && sessionObj.selectedImages.length > 0) {
          console.log(`[SAFEGUARD] Ignored empty selectedImages sync for session ${session} at step ${targetStep}`);
      } else {
          sessionObj.selectedImages = selectedImages;
      }
  }
  
  if (slots !== undefined) {
      const hasImages = slots.some(s => s.imageId);
      const hadImages = sessionObj.slots && sessionObj.slots.some(s => s.imageId);
      if (targetStep >= 3 && !hasImages && hadImages) {
          console.log(`[SAFEGUARD] Ignored empty slots sync for session ${session} at step ${targetStep}`);
      } else {
          sessionObj.slots = slots;
      }
  }
"""

content = content.replace("  if (step !== undefined) sessionObj.step = step;\n  if (currentTemplate !== undefined) sessionObj.currentTemplate = currentTemplate;\n  if (selectedImages !== undefined) sessionObj.selectedImages = selectedImages;\n  if (slots !== undefined) sessionObj.slots = slots;", replacement)

with open('server.js', 'w') as f:
    f.write(content)

