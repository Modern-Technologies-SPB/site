$(function () {
    var initialOffsetX1, initialOffsetY1;
    var initialOffsetX2, initialOffsetY2;
    var initialOffsetX3, initialOffsetY3;
    var initialOffsetX4, initialOffsetY4;
    var initialOffsetX5, initialOffsetY5;
    var initialOffsetX6, initialOffsetY6;

        function makeDraggable($element, posX, posY) {
            $element.draggable({
                containment: ".container",
                cursor: "crosshair",
                start: function (event, ui) {
                    var offset = $element.offset();
                    var containerOffset = $(".container").offset();
                    posX = offset.left - ui.position.left - containerOffset.left;
                    posY = offset.top - ui.position.top - containerOffset.top;
                },
                drag: function (event, ui) {
                    $('#posY' + $element.attr('id')).val((ui.position.top + posY) * 3);
                    $('#posX' + $element.attr('id')).val((ui.position.left + posX) * 3);
                }
            });

        
        }
    
        makeDraggable($("#boxTime"), initialOffsetX1, initialOffsetY1);
        makeDraggable($("#boxSpeed"), initialOffsetX2, initialOffsetY2);
        makeDraggable($("#boxNumber"), initialOffsetX3, initialOffsetY3);
        makeDraggable($("#boxGPS"), initialOffsetX4, initialOffsetY4);
        makeDraggable($("#boxName"), initialOffsetX5, initialOffsetY5);
        makeDraggable($("#boxID"), initialOffsetX6, initialOffsetY6);
    
});
