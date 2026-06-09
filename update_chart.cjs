const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

// 1. Add drag-scroll to addRunChartGraph
const dragCode = `
    const canvasWrap = panel.querySelector('.rc-canvas-wrap');
    if (canvasWrap) {
      let isDown = false;
      let startX;
      let scrollLeft;
      canvasWrap.addEventListener('mousedown', (e) => {
        isDown = true;
        canvasWrap.style.cursor = 'grabbing';
        startX = e.pageX - canvasWrap.offsetLeft;
        scrollLeft = canvasWrap.scrollLeft;
      });
      canvasWrap.addEventListener('mouseleave', () => {
        isDown = false;
        canvasWrap.style.cursor = 'grab';
      });
      canvasWrap.addEventListener('mouseup', () => {
        isDown = false;
        canvasWrap.style.cursor = 'grab';
      });
      canvasWrap.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - canvasWrap.offsetLeft;
        const walk = (x - startX) * 1.5;
        canvasWrap.scrollLeft = scrollLeft - walk;
      });
    }
    activeRunCharts.push(chartInstance);`;
code = code.replace("activeRunCharts.push(chartInstance);", dragCode);

// 2. Replace width calculation in drawToleranceChart
const oldWidthCode = `    // Size canvas properly
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width - 48; // padding (24 left + 24 right)
    const h = 220;`;

const newWidthCode = `    // Read data to calculate dynamic width
    const pts = chart.readings || [];
    const pxPerStep = 60; // 60 pixels width per data point

    // Size canvas properly
    const rect = canvas.parentElement.getBoundingClientRect();
    const minW = rect.width - 48; // padding (24 left + 24 right)
    const requiredDataWidth = 65 + 20 + (pts.length * pxPerStep); // margin.left + margin.right + data space
    const w = Math.max(minW, requiredDataWidth);
    
    // Auto-scroll to the right so new data is instantly visible
    const wrap = canvas.closest('.rc-canvas-wrap');
    if (wrap && canvas.width !== (w * (window.devicePixelRatio || 1))) {
       // Only snap scroll if the canvas actually grew larger to fit new data
       setTimeout(() => wrap.scrollLeft = wrap.scrollWidth, 0);
    }

    const h = 220;`;
code = code.replace(oldWidthCode, newWidthCode);

// 3. Replace point window and grid calculation
const oldGridCode = `    // We strictly use a 10-sample sliding window so labels are perpetually 0..10
    const visiblePts = pts.slice(-11); // up to 11 points for 10 intervals

    // Map X value (index) to pixel
    const xToPixel = (i) => {
      return margin.left + (i / 10) * cw;
    };

    const xSteps = 5; // We want exactly 0, 2, 4, 6, 8, 10`;

const newGridCode = `    // Display ALL points extending infinitely
    const visiblePts = pts;

    // Map X value (index) to pixel using absolute pixels per step
    const xToPixel = (i) => {
      // If pts.length < 10, we span across the minimum width. 
      // Otherwise we use absolute pxPerStep.
      const intervals = Math.max(10, pts.length);
      return margin.left + (i / intervals) * cw;
    };

    const maxVal = Math.max(10, pts.length);
    const xSteps = Math.floor(maxVal / 2); // Steps for 0, 2, 4, 6, 8...`;
code = code.replace(oldGridCode, newGridCode);

// 4. Update Grid looping bounds for the background shade boxes and lines
code = code.replace(
  "for (let j = 0; j <= xSteps; j++) {",
  "for (let j = 0; j <= xSteps; j++) {"
); // Doesn't need change because xSteps was fixed dynamically above!

// But wait, the previous slice trick meant visiblePts indices were 0 through 10.
// Now visiblePts indices are 0 through pts.length. But the actual point count is in pt.count!
const oldLineDrawCode = `      visiblePts.forEach((pt, i) => {
        const x = xToPixel(i);`;
const newLineDrawCode = `      visiblePts.forEach((pt, i) => {
        const trueXIndex = (pt.count - 1); // Real index from 0 to N
        const x = xToPixel(trueXIndex);`;
code = code.split(oldLineDrawCode).join(newLineDrawCode);

const oldDotCode = `      visiblePts.forEach((pt, i) => {
        const x = xToPixel(i);`;
const newDotCode = `      visiblePts.forEach((pt, i) => {
        const trueXIndex = (pt.count - 1);
        const x = xToPixel(trueXIndex);`;
// Only replace the second match (for dots) since first was already replaced!
code = code.replace(oldDotCode, newDotCode);

fs.writeFileSync('src/main.js', code);
console.log('Script updated');
