import { VNode, VNodeData } from '../vnode';
import { Module } from './module';

export type Props = Record<string, any>;


function updateProps(oldVnode: VNode, vnode: VNode): void {
    var key: string,
        cur: any,
        old: any,
        elm = vnode.elm,
        oldProps = (oldVnode.data as VNodeData).props,
        props = (vnode.data as VNodeData).props;

    if (!oldProps && !props) return;
    if (oldProps === props) return;

    oldProps = oldProps || {};
    props = props || {};

    // 删除多余的属性
    for (key in oldProps) {
        if (!props[key]) {
            delete (elm as any)[key];
        }
    }

    // 添加新增的属性
    for (key in props) {
        cur = props[key];
        old = oldProps[key];
        // key为value的情况，再判断是否value有变化
        // key不为value的情况，直接更新
        if (old !== cur && (key !== 'value' || (elm as any)[key] !== cur)) {
            (elm as any)[key] = cur;
        }
    }
}

// 创建以及更新属性
export const propsModule = {
    create: updateProps,
    update: updateProps
} as Module;
export default propsModule;
