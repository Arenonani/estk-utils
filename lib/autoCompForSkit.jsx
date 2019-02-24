const document = app.activeDocument;

// enums
const WEAR_NAME = [
    'A',
    'B',
    'C',
    'D'
];

const WEAR_LMT = WEAR_NAME.length;
const FACE_LMT = 25;

// document dependent constants
const faceLayerSetName = '表情';
faceLayerSet = document.layerSets.getByName(faceLayerSetName);

// polyfill
Array.prototype.map = function(fn) {
    const mapped = [];
    for (var i = 0; i < this.length; ++i) {
        mapped.push(fn(this[i]));
    }
    return mapped;
};

function walk(elm, fn) {
    fn(elm, elm.typename);
    if (elm.layers) {
        for (var i = 0; i < elm.layers.length; ++i) {
            walk(elm.layers[i], fn);
        }
    }
}
function child(elm, fn) {
    if (elm.layers) {
        for (var i = 0; i < elm.layers.length; ++i) {
            fn(elm.layers[i], elm.layers[i].typename);
        }
    }
}

function parseLayerName(layerName) {
    if (typeof layerName !== 'string') throw new Error('layerName is not string');

    const re = new RegExp('([ox])([ox])([ox])([ox])', 'i');
    const m = layerName.match(re);

    if (m) {
        return m.slice(1).map(function(c){return c.toLowerCase() === 'o';});
    } else {
        return null;
    }
}

function setWear(wearIndex) {
    if (wearIndex >= WEAR_LMT) throw new Error('wearIndex is out of range');

    walk(document, function(layer, type) {
        if (type !== 'ArtLayer' && type !== 'LayerSet') return;

        const result = parseLayerName(layer.name);
        if (result) {
            const visible = result[wearIndex];
            if (layer.visible !== visible) { // for performance
                layer.visible = visible;
            }
        } else {
            // if layer has no wear specification, skip it
        }
    });
}

function unsetWear() {
    walk(document, function(layer, type) {
        if (type !== 'ArtLayer' && type !== 'LayerSet') return;

        const result = parseLayerName(layer.name);
        if (result) {
            if (layer.visible !== false) { // for performance
                layer.visible = false;
            }
        } else {
            // if layer has no wear specification, skip it
        }
    });
}

function getFaceLayer(faceIndex) {
    var foundLayer = null;

    child(faceLayerSet, function(layer, type) {
        const n = parseInt(layer.name, 10);
        if (!isNaN(n)) {
            if (n === faceIndex) {
                if (!foundLayer) {
                    foundLayer = layer;
                } else {
                    throw new Error('duplicate face index "' + faceIndex + '"');
                }
            }
        } else {
            throw new Error('invalid layer name "' + layer.name + '" is found in "' + faceLayerSetName + '"');
        }
    });

    if (foundLayer) {
        return foundLayer;
    } else {
        return null;
    }
}

function setFace(faceIndex) {
    var foundLayer = getFaceLayer(faceIndex);

    foundLayer && child(faceLayerSet, function(layer, type) {
        // make visible specified layer only
        layer.visible = (layer === foundLayer);
    });
    return !!foundLayer;
}

function unsetFace() {
    child(faceLayerSet, function(layer, type) {
        layer.visible = false;
    });
}

function setBody(visible) {
    walk(document, function(layer, type) {
        if (type !== 'ArtLayer' && type !== 'LayerSet') return;
        if (layer.name[0] === '@') {
            if (layer.visible !== visible) { // for performance
                layer.visible = visible;
            }
        }
    });
}

function makeComp(compName) {
    const opts = {
        appearance: false,
        position: false,
        visibility: true
    };
    document.layerComps.add(compName, '',
        opts.appearance, opts.position, opts.visibility);
}

function makeFaceComp(face) {
}

function main() {
    var poseName = prompt("ポーズ名","","");

    document.layerComps.removeAll();
    var i = 0;
    var cancel;

    // plain body
    setBody(true);
    unsetWear();
    unsetFace();
    makeComp(poseName);
    cancel = !doProgressSubTask(++i, WEAR_LMT + FACE_LMT + 1, '');
    if (cancel) return;

    // faces
    var isFirstFace = true;
    setBody(false);
    for (var face = 0; face < FACE_LMT; ++face) {
        var faceLayer = getFaceLayer(face);
        if (!faceLayer) continue;
    
        setFace(face);
    
        var faceName = faceLayer.name.match(/^\d+\s*(.*)$/)[1];
        makeComp(poseName + '_' + faceName);
        if (isFirstFace) {
            makeComp(poseName + '_default');
            isFirstFace = false;
        }

        cancel = !doProgressSubTask(++i, WEAR_LMT + FACE_LMT + 1, '');
        if (cancel) return;
    }

    // wears
    unsetFace();
    for (var wear = 0; wear < WEAR_LMT; ++wear) {
        setWear(wear);
        makeComp('costume_wear' + WEAR_NAME[wear] + '_' + poseName);
        cancel = !doProgressSubTask(++i, WEAR_LMT + FACE_LMT + 1, '');
        if (cancel) return;
    }

    document.layerComps[0].apply();
}

doForcedProgress('AutoCompForSkit', 'main()');
