const document = app.activeDocument;

// enums
const POSE_NAME = [
    'A',
    'B',
    'C',
    'D'
];
const POSE_LMT = POSE_NAME.length;
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

function setPose(poseIndex) {
    if (poseIndex >= POSE_LMT) throw new Error('poseIndex is out of range');

    walk(document, function(layer, type) {
        if (type !== 'ArtLayer' && type !== 'LayerSet') return;

        const result = parseLayerName(layer.name);
        if (result) {
            const visible = result[poseIndex];
            if (layer.visible !== visible) { // for performance
                layer.visible = visible;
            }
        } else {
            // if layer has no pose specification, skip it
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

function makeComp(pose, face) {
    var faceLayer = getFaceLayer(face);
    if (!faceLayer) return;

    setFace(face);

    var poseName = POSE_NAME[pose];
    var faceName = faceLayer.name.match(/^\d+\s*(.*)$/)[1];
    var faceNum = ('0' + face).slice(-2); // zero padding
    var parts = [poseName, faceNum, faceName];

    const opts = {
        appearance: false,
        position: false,
        visibility: true
    };
    document.layerComps.add(parts.join('_'), '',
        opts.appearance, opts.position, opts.visibility);
}

function main() {
    document.layerComps.removeAll();

    var i = 0;
    for (var pose = 0; pose < POSE_LMT; ++pose) {
        setPose(pose);

        for (var face = 0; face < FACE_LMT; ++face) {
            makeComp(pose, face);
            var cancel = !doProgressSubTask(++i, POSE_LMT * FACE_LMT, '');
            if (cancel) return;
        }
    }
    document.layerComps[0].apply();
}

doForcedProgress('AutoComp', 'main()');
