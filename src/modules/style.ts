import { VNode, VNodeData } from '../vnode';
import { Module } from './module';

export type VNodeStyle = Record<string, string> & {
    delayed?: Record<string, string>;
    remove?: Record<string, string>;
};

var raf =
    (typeof window !== 'undefined' && window.requestAnimationFrame) ||
    setTimeout;

// 下一个事件循环中处理
var nextFrame = function(fn: any) {
    raf(function() {
        raf(fn);
    });
};
var reflowForced = false;

// 在下一帧增加属性
function setNextFrame(obj: any, prop: string, val: any): void {
    nextFrame(function() {
        obj[prop] = val;
    });
}

/**
 * 更新以及创建样式
 */
function updateStyle(oldVnode: VNode, vnode: VNode): void {
    var cur: any,
        name: string,
        elm = vnode.elm,
        oldStyle = (oldVnode.data as VNodeData).style,
        style = (vnode.data as VNodeData).style;

    if (!oldStyle && !style) return;
    if (oldStyle === style) return;

    oldStyle = oldStyle || ({} as VNodeStyle);
    style = style || ({} as VNodeStyle);

    var oldHasDel = 'delayed' in oldStyle;

    // 删除多余的样式
    for (name in oldStyle) {
        if (!style[name]) {
            if (name[0] === '-' && name[1] === '-') {
                (elm as any).style.removeProperty(name);
            } else {
                (elm as any).style[name] = '';
            }
        }
    }

    // 添加新增的样式
    for (name in style) {
        cur = style[name];
        // 处理需要延迟处理的
        if (name === 'delayed' && style.delayed) {
            for (let name2 in style.delayed) {
                cur = style.delayed[name2];
                if (!oldHasDel || cur !== (oldStyle.delayed as any)[name2]) {
                    setNextFrame((elm as any).style, name2, cur);
                }
            }
        } else if (name !== 'remove' && cur !== oldStyle[name]) {
            if (name[0] === '-' && name[1] === '-') {
                // 自定义样式的处理，CSS变量
                (elm as any).style.setProperty(name, cur);
            } else {
                (elm as any).style[name] = cur;
            }
        }
    }
}

function applyDestroyStyle(vnode: VNode): void {
    var style: any,
        name: string,
        elm = vnode.elm,
        s = (vnode.data as VNodeData).style;

    if (!s || !(style = s.destroy)) return;

    // 重置 vnode.data.style.destroy里的属性
    for (name in style) {
        (elm as any).style[name] = style[name];
    }
}

function applyRemoveStyle(vnode: VNode, rm: () => void): void {
    var s = (vnode.data as VNodeData).style;

    // 没有需要删除的，直接调用回调函数
    if (!s || !s.remove) {
        rm();
        return;
    }

    if (!reflowForced) {
        getComputedStyle(document.body).transform;
        reflowForced = true;
    }

    var name: string,
        elm = vnode.elm,
        i = 0,
        compStyle: CSSStyleDeclaration,
        style = s.remove,
        amount = 0,
        applied: Array<string> = [];


    for (name in style) {
        applied.push(name);
        (elm as any).style[name] = style[name];
    }

    compStyle = getComputedStyle(elm as Element);
    // css3 动画需要删除的属性，记录数量，并在动画完成后再执行回调
    var props = (compStyle as any)['transition-property'].split(', ');
    for (; i < props.length; ++i) {
        if (applied.indexOf(props[i]) !== -1) amount++;
    }
    (elm as Element).addEventListener('transitionend', function(
        ev: TransitionEvent
    ) {
        if (ev.target === elm) --amount;
        if (amount === 0) rm();
    });
}

function forceReflow() {
    reflowForced = false;
}

//
export const styleModule = {
    pre: forceReflow,
    create: updateStyle,
    update: updateStyle,
    destroy: applyDestroyStyle,
    remove: applyRemoveStyle
} as Module;
export default styleModule;
