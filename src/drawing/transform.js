Transformable = function(transform) {
    this.mv_transform = transform != undefined ? transform : mat3.create();
}

Transformable.prototype.translate = function(v) {
    var transform = this.mv_transform;
    mat3.translate(transform, transform, v);
    return this;
}
Transformable.prototype.rotate = function(r) {
    var transform = this.mv_transform;
    mat3.rotate(transform, transform, r);
    return this;
}
Transformable.prototype.rotate_degrees = function(d) {
    var transform = this.mv_transform;
    mat3.rotate(transform, transform, d*Math.PI/180);
    return this;
}
Transformable.prototype.scale = function(v) {
    var transform = this.mv_transform;
    mat3.scale(transform, transform, v);
    return this;
}
Transformable.prototype.transform = function(t) {
    var transform = this.mv_transform;
    mat3.multiply(transform, transform, t);
    return this;
}

function TransformStack(stack_size) {
    stack_size = stack_size != undefined ? stack_size : 32;
    this.stack = new Array(stack_size);
    for (var i = 0;i<stack_size;++i) {
        this.stack[i] = mat3.create();
    }
    this.idx = 0;
    this.mv_transform = this.stack[this.idx];
}
TransformStack.inherits_from(Transformable);

TransformStack.prototype.save = function() {
    ++this.idx;
    var current = this.mv_transform;
    var next = this.stack[this.idx];
    
    mat3.copy(next, current);

    this.mv_transform = next;
}
TransformStack.prototype.restore = function() {
    --this.idx;
    this.mv_transform = this.stack[this.idx];
}
