import {
  getPosition,
  getSortedNumbers,
  getMidNumbers,
  getEverage,
  getNums,
  getOrderedNums,
  getMidIndex,
  getParallelSpacing,
  getMargin
} from './mark'

// 0.32 -> 32%
export const toPercentage = num => `${num*100}%`

// '100px' -> 100
export const px2number = str => str.replace('px', '') - 0

// 0.2637378 -> 0.26, 8 -> 8
export const toFixed = num => Math.floor(num)===num ? num : (num.toFixed(2) - 0)

// generate box data
export const generateRects = (nodes, docRect) => {
  let index = 0
  const rects = []
  const step = (nodes) => {
    nodes.map(node => {
      const nbb = node.absoluteBoundingBox
      if (node.visible===false) {
        return 1
      } else {
        if (node.type!=='GROUP') {
          const top = (nbb.y - docRect.y)
          const left = (nbb.x - docRect.x)
          const width = nbb.width
          const height = nbb.height
          rects.push({
            index: index++,
            top: top,
            left: left,
            bottom: top+height,
            right: left+width,
            width: width,
            height: height,
            actualWidth: toFixed(nbb.width),
            actualHeight: toFixed(nbb.height),
            title: node.name,
            clazz: [
              node.type==='COMPONENT' || node.type==='INSTANCE' ? 'component' : ''
            ],
            node
          })
        }
        if (node.children) {
          step(node.children)
        }
        return 1
      }
    })
  }
  step(nodes)
  return rects
}

// selectedRect is clicked box
// targetRect is hovered box
export const isIntersect = (selectedRect, targetRect) => {
  return !(
    selectedRect.right <= targetRect.left ||
    selectedRect.left >= targetRect.right ||
    selectedRect.top >= targetRect.bottom ||
    selectedRect.bottom <= targetRect.top
  )
}

// calculate distance data
export const calculateMarkData = (selected, target, pageRect) => {
  // has selected and not the the same
  if (selected && (selected.index !== target.index)){
    const pw = pageRect.width
    const ph = pageRect.height
    const selectedMidX = selected.left + selected.width / 2
    const selectedMidY = selected.top + selected.height / 2
    const verticalNums = [selected.top, selected.bottom, target.top, target.bottom]
    const horizontalNums = [selected.left, selected.right, target.left, target.right]
    const distanceData = [], rulerData = []
    // not intersect
    if (!isIntersect(selected, target)) {
      const position = getPosition(selected, target)
      if (position.v && position.h && position.v[0]>0 && position.h[0]>0) {
        // not intersect in any direction
        const spacingV = position.v[0]
        const spacingH = position.h[0]
        const selectedIsCloserV = position.v[1]===0
        const selectedIsCloserH = position.h[1]===0
        distanceData.push({
          x: (selectedIsCloserH ? selected.right : target.right)/pw,
          y: selectedMidY/ph,
          w: spacingH/pw,
          distance: toFixed(spacingH)
        })
        distanceData.push({
          x: selectedMidX/pw,
          y: (selectedIsCloserV ? selected.bottom : target.bottom)/ph,
          h: spacingV/ph,
          distance: toFixed(spacingV)
        })
        rulerData.push({
          x: (selectedIsCloserH ? selectedMidX : target.right)/pw,
          y: (selectedIsCloserV ? target.top : target.bottom)/ph,
          w: (selected.width/2 + spacingH)/pw,
          distance: toFixed(selected.width/2 + spacingH)
        })
        rulerData.push({
          x: (selectedIsCloserH ? target.left : target.right)/pw,
          y: (selectedIsCloserV ? selectedMidY : target.bottom)/ph,
          h: (selected.height/2 + spacingV)/ph,
          distance: toFixed(selected.height/2 + spacingV)
        })
      } else if (position.v && position.h && (position.v[0]===0 || position.h[0]===0)) {
        // intersect at a point
        if (position.v[0]===0 && position.h[0]===0) {
          const sortedVNumbers = getSortedNumbers(verticalNums)
          const sortedHNumbers = getSortedNumbers(horizontalNums)
          const edges = [sortedVNumbers[0], sortedVNumbers[3], sortedHNumbers[0], sortedHNumbers[3]]
          const mids = [sortedVNumbers[1], sortedHNumbers[1]]
          // position like \
          const isBackslashed = position.v[1]===position.h[1]
          edges.map((edge, index) => {
            let unfixedNum, d
            const flag = index%2===0 ? isBackslashed : !isBackslashed
            if (index<2) {
              unfixedNum = flag ? mids[1] : edges[2]
              d = flag ? edges[3]-mids[1] : mids[1]-edges[2]
            } else {
              unfixedNum = flag ? mids[0] : edges[0]
              d = flag ? edges[1]-mids[0] : mids[0]-edges[0]
            }
            distanceData.push({
              x: (index<2 ? unfixedNum : edge)/pw,
              y: (index<2 ? edge : unfixedNum)/ph,
              [index<2 ? 'w' : 'h']: d/(index<2 ? pw : ph),
              distance: toFixed(d)
            })
          })
        } else {
          const direction = position.v[0]!==0 ? 'v' : 'h'
          const nums = getNums(direction, verticalNums, horizontalNums)
          const orderedNums = getOrderedNums(nums)
          distanceData.push({
            x: direction==='v' ? orderedNums['intersect'][1]/pw : orderedNums['parallel'][1]/pw,
            y: direction==='v' ? orderedNums['parallel'][1]/ph : orderedNums['intersect'][1]/ph,
            [direction==='v' ? 'h' : 'w']: (position[direction][0])/(direction==='v' ? ph : pw),
            distance: toFixed(position[direction][0])
          })
        }
      } else {
        // intersect vertically, parallel horizontally, or opposite
        const direction = position.v ? 'v' : 'h'
        const closerIndex = position[direction][1]
        const nums = getNums(direction, verticalNums, horizontalNums)
        const orderedNums = getOrderedNums(nums)
        const mids =[getEverage(orderedNums['parallel'].slice(0, 2)), getEverage(orderedNums['parallel'].slice(2))]
        const midIndex = getMidIndex(nums['intersect'], closerIndex)
        const parallelSpacing = getParallelSpacing(orderedNums['parallel'])
        const margins = [getMargin(orderedNums['intersect'], 'smaller'), getMargin(orderedNums['intersect'])]
        if (parallelSpacing!==0) {
          distanceData.push({
            x: direction==='v' ? getEverage(orderedNums['intersect'].slice(1,3))/pw : orderedNums['parallel'][1]/pw,
            y: direction==='v' ? orderedNums['parallel'][1]/ph : getEverage(orderedNums['intersect'].slice(1,3))/ph,
            [direction==='v' ? 'h' : 'w']: (parallelSpacing)/(direction==='v' ? ph : pw),
            distance: toFixed(parallelSpacing)
          })
        }
        margins.map((margin, index) => {
          if (margin!==0) {
            const rulerUnfixedStart = midIndex[index]===0 ? mids[0] : orderedNums['parallel'][1]
            const rulerDistance = midIndex[index]===0 ? (orderedNums['parallel'][2] - mids[0]) : (mids[1] - orderedNums['parallel'][1])
            distanceData.push({
              x: (direction==='v' ? orderedNums['intersect'][index*2] : mids[midIndex[index]])/pw,
              y: (direction==='v' ? mids[midIndex[index]] : orderedNums['intersect'][index*2])/ph,
              [direction==='v' ? 'w' : 'h']: margin/(direction==='v' ? pw : ph),
              distance: toFixed(margin)
            })
            rulerData.push({
              x: (direction==='v' ? orderedNums['intersect'][index*3] : rulerUnfixedStart)/pw,
              y: (direction==='v' ? rulerUnfixedStart : orderedNums['intersect'][index*3])/ph,
              [direction==='v' ? 'h' : 'w']: rulerDistance/(direction==='v' ? ph : pw),
              distance: toFixed(rulerDistance/(direction==='v' ? ph : pw))
            })
          }
        })
      }
    } else {
      const sortedVNumbers = getSortedNumbers(verticalNums)
      const sortedHNumbers = getSortedNumbers(horizontalNums)
      const x = getEverage(getMidNumbers(sortedHNumbers))
      const y = getEverage(getMidNumbers(sortedVNumbers))
      if (sortedVNumbers[1] - sortedVNumbers[0]!==0) {
        distanceData.push({
          x: x/pw,
          y: sortedVNumbers[0]/ph,
          h: (sortedVNumbers[1] - sortedVNumbers[0])/ph,
          distance: toFixed(sortedVNumbers[1] - sortedVNumbers[0])
        })
      }
      if (sortedVNumbers[3] - sortedVNumbers[2]!==0) {
        distanceData.push({
          x: x/pw,
          y: sortedVNumbers[2]/ph,
          h: (sortedVNumbers[3] - sortedVNumbers[2])/ph,
          distance: toFixed(sortedVNumbers[3] - sortedVNumbers[2])
        })
      }
      if (sortedHNumbers[1] - sortedHNumbers[0]!==0) {
        distanceData.push({
          x: sortedHNumbers[0]/pw,
          y: y/ph,
          w: (sortedHNumbers[1] - sortedHNumbers[0])/pw,
          distance: toFixed(sortedHNumbers[1] - sortedHNumbers[0])
        })
      }
      if (sortedHNumbers[3] - sortedHNumbers[2]!==0) {
        distanceData.push({
          x: sortedHNumbers[2]/pw,
          y: y/ph,
          w: (sortedHNumbers[3] - sortedHNumbers[2])/pw,
          distance: toFixed(sortedHNumbers[3] - sortedHNumbers[2])
        })
      }
    }
    return {
      distanceData,
      rulerData
    }
  } else {
    return {}
  }
}

export const throttle = (fn, delay) => {
 	var timer = null
 	return function(){
 		var context = this, args = arguments;
 		clearTimeout(timer)
 		timer = setTimeout(function(){
 			fn.apply(context, args);
 		}, delay)
 	}
}
