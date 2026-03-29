(function () {
    'use strict';

    window.initSharedMomentumScroller = function (options) {
        var opts = options || {};
        var selector = typeof opts.selector === 'string' ? opts.selector : null;
        var inputElements = opts.elements || opts.element || null;
        var dragThreshold = typeof opts.dragThreshold === 'number' ? opts.dragThreshold : 4;
        var friction = typeof opts.friction === 'number' ? opts.friction : 0.94;
        var minVelocity = typeof opts.minVelocity === 'number' ? opts.minVelocity : 0.02;
        var frameDistance = typeof opts.frameDistance === 'number' ? opts.frameDistance : 16;
        var momentum = opts.momentum !== false;
        var draggingClass = opts.draggingClass || 'dragging';
        var useNativeTouch = opts.nativeTouch !== false;

        function toArray(value) {
            if (!value) {
                return [];
            }

            if (typeof value.length === 'number' && typeof value !== 'string' && !value.nodeType) {
                return Array.prototype.slice.call(value);
            }

            return [value];
        }

        function initElement(element) {
            if (!element) {
                return null;
            }

            if (typeof element.__sharedMomentumScrollerCleanup === 'function') {
                element.__sharedMomentumScrollerCleanup();
            }

            var isDragging = false;
            var startX = 0;
            var startScrollLeft = 0;
            var lastX = 0;
            var lastTime = 0;
            var velocityX = 0;
            var momentumFrame = null;
            var didDrag = false;
            var originalTouchAction = element.style.touchAction;
            var originalWebkitOverflowScrolling = element.style.webkitOverflowScrolling;
            var originalOverscrollBehaviorX = element.style.overscrollBehaviorX;

            if (useNativeTouch) {
                element.style.touchAction = 'auto';
                element.style.webkitOverflowScrolling = 'touch';
                element.style.overscrollBehaviorX = 'contain';
            }

            function stopMomentum() {
                if (momentumFrame) {
                    cancelAnimationFrame(momentumFrame);
                    momentumFrame = null;
                }
            }

            function runMomentum() {
                if (!momentum) {
                    return;
                }

                stopMomentum();

                function step() {
                    if (Math.abs(velocityX) < minVelocity) {
                        stopMomentum();
                        return;
                    }

                    element.scrollLeft -= velocityX * frameDistance;
                    velocityX *= friction;
                    momentumFrame = requestAnimationFrame(step);
                }

                momentumFrame = requestAnimationFrame(step);
            }

            function beginDrag(clientX) {
                stopMomentum();
                isDragging = true;
                didDrag = false;
                startX = clientX;
                startScrollLeft = element.scrollLeft;
                lastX = clientX;
                lastTime = performance.now();
                velocityX = 0;
                element.classList.add(draggingClass);
            }

            function moveDrag(clientX) {
                if (!isDragging) {
                    return;
                }

                var deltaX = clientX - startX;
                element.scrollLeft = startScrollLeft - deltaX;

                if (Math.abs(deltaX) > dragThreshold) {
                    didDrag = true;
                }

                var now = performance.now();
                var dt = now - lastTime;
                if (dt > 0) {
                    velocityX = (clientX - lastX) / dt;
                }

                lastX = clientX;
                lastTime = now;
            }

            function endDrag() {
                if (!isDragging) {
                    return;
                }

                isDragging = false;
                element.classList.remove(draggingClass);

                if (didDrag) {
                    runMomentum();
                }
            }

            function onMouseDown(event) {
                beginDrag(event.pageX);
            }

            function onMouseMove(event) {
                if (!isDragging) {
                    return;
                }

                event.preventDefault();
                moveDrag(event.pageX);
            }

            function onTouchStart(event) {
                var touch = event.touches[0];
                if (!touch) {
                    return;
                }

                beginDrag(touch.clientX);
            }

            function onTouchMove(event) {
                if (!isDragging) {
                    return;
                }

                var touch = event.touches[0];
                if (!touch) {
                    return;
                }

                moveDrag(touch.clientX);
            }

            function onDragStart(event) {
                event.preventDefault();
            }

            function onClick(event) {
                if (!didDrag) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                didDrag = false;
            }

            element.addEventListener('mouseleave', endDrag);
            element.addEventListener('mouseup', endDrag);
            element.addEventListener('mousedown', onMouseDown);
            element.addEventListener('mousemove', onMouseMove);
            if (!useNativeTouch) {
                element.addEventListener('touchstart', onTouchStart, { passive: true });
                element.addEventListener('touchmove', onTouchMove, { passive: true });
                element.addEventListener('touchend', endDrag);
                element.addEventListener('touchcancel', endDrag);
            }
            element.addEventListener('dragstart', onDragStart);
            element.addEventListener('click', onClick, true);

            function destroy() {
                stopMomentum();
                isDragging = false;
                element.classList.remove(draggingClass);
                element.removeEventListener('mouseleave', endDrag);
                element.removeEventListener('mouseup', endDrag);
                element.removeEventListener('mousedown', onMouseDown);
                element.removeEventListener('mousemove', onMouseMove);
                if (!useNativeTouch) {
                    element.removeEventListener('touchstart', onTouchStart, { passive: true });
                    element.removeEventListener('touchmove', onTouchMove, { passive: true });
                    element.removeEventListener('touchend', endDrag);
                    element.removeEventListener('touchcancel', endDrag);
                }
                element.removeEventListener('dragstart', onDragStart);
                element.removeEventListener('click', onClick, true);
                element.style.touchAction = originalTouchAction;
                element.style.webkitOverflowScrolling = originalWebkitOverflowScrolling;
                element.style.overscrollBehaviorX = originalOverscrollBehaviorX;
                delete element.__sharedMomentumScrollerCleanup;
            }

            element.__sharedMomentumScrollerCleanup = destroy;

            return {
                element: element,
                destroy: destroy,
                stopMomentum: stopMomentum
            };
        }

        var elements = selector ? Array.prototype.slice.call(document.querySelectorAll(selector)) : toArray(inputElements);
        var instances = elements.map(initElement).filter(Boolean);

        return {
            elements: elements,
            instances: instances,
            destroy: function () {
                instances.forEach(function (instance) {
                    instance.destroy();
                });
            }
        };
    };
})();