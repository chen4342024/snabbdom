import { vnode, VNode, VNodeData } from './vnode';
export type VNodes = Array<VNode>;
export type VNodeChildElement = VNode | string | number | undefined | null;
export type ArrayOrElement<T> = T | T[];
export type VNodeChildren = ArrayOrElement<VNodeChildElement>;
import * as is from './is';

// 添加 namespace
function addNS(
    data: any,
    children: VNodes | undefined,
    sel: string | undefined
): void {
    data.ns = 'http://www.w3.org/2000/svg';
    if (sel !== 'foreignObject' && children !== undefined) {

        for (let i = 0; i < children.length; ++i) {
            let childData = children[i].data;
            if (childData !== undefined) {
                addNS(
                    childData,
                    (children[i] as VNode).children as VNodes,
                    children[i].sel
                );
            }
        }
    }
}

/**
 * 根据选择器 ，数据 ，
 */
export function h(sel: string): VNode;
export function h(sel: string, data: VNodeData): VNode;
export function h(sel: string, children: VNodeChildren): VNode;
export function h(sel: string, data: VNodeData, children: VNodeChildren): VNode;
export function h(sel: any, b?: any, c?: any): VNode {

    var data: VNodeData = {},
        children: any,
        text: any,
        i: number;

    /**
     * 处理参数
     */
    if (c !== undefined) {
        // 三个参数的情况  sel , data , children | text
        data = b;
        if (is.array(c)) {
            children = c;
        } else if (is.primitive(c)) {
            text = c;
        } else if (c && c.sel) {
            children = [c];
        }
    } else if (b !== undefined) {
        // 两个参数的情况 : sel , children | text
        // 两个参数的情况 : sel , data
        if (is.array(b)) {
            children = b;
        } else if (is.primitive(b)) {
            text = b;
        } else if (b && b.sel) {
            children = [b];
        } else {
            data = b;
        }
    }

    if (children !== undefined) {
        for (i = 0; i < children.length; ++i) {
            // 如果children是文本或数字 ，则创建文本节点
            if (is.primitive(children[i]))
                children[i] = vnode(
                    undefined,
                    undefined,
                    undefined,
                    children[i],
                    undefined
                );
        }
    }

    // 处理svg
    if (
        sel[0] === 's' &&
        sel[1] === 'v' &&
        sel[2] === 'g' &&
        (sel.length === 3 || sel[3] === '.' || sel[3] === '#')
    ) {
        // 增加 namespace
        addNS(data, children, sel);
    }
    // 生成 vnoe
    return vnode(sel, data, children, text, undefined);
}
export default h;
