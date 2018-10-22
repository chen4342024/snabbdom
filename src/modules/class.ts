import { VNode, VNodeData } from '../vnode';
import { Module } from './module';

export type Classes = Record<string, boolean>;

function updateClass(oldVnode: VNode, vnode: VNode): void {
    var cur: any,
        name: string,
        elm: Element = vnode.elm as Element,
        oldClass = (oldVnode.data as VNodeData).class,
        klass = (vnode.data as VNodeData).class;

    // 新老的 className 都没有
    if (!oldClass && !klass) return;
    // 新老的 className 没变
    if (oldClass === klass) return;

    oldClass = oldClass || {};
    klass = klass || {};

    // 删除不存在与新的 classList 的 className
    for (name in oldClass) {
        if (!klass[name]) {
            elm.classList.remove(name);
        }
    }

    // 新增 或删除 class
    for (name in klass) {
        cur = klass[name];
        if (cur !== oldClass[name]) {
            (elm.classList as any)[cur ? 'add' : 'remove'](name);
        }
    }
}

// 创建以及更新 className
export const classModule = {
    create: updateClass,
    update: updateClass
} as Module;
export default classModule;
