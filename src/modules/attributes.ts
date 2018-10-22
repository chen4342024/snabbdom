import { VNode, VNodeData } from '../vnode';
import { Module } from './module';

// because those in TypeScript are too restrictive: https://github.com/Microsoft/TSJS-lib-generator/pull/237
declare global {
    interface Element {
        setAttribute(name: string, value: string | number | boolean): void;
        setAttributeNS(
            namespaceURI: string,
            qualifiedName: string,
            value: string | number | boolean
        ): void;
    }
}

export type Attrs = Record<string, string | number | boolean>;

const xlinkNS = 'http://www.w3.org/1999/xlink';
const xmlNS = 'http://www.w3.org/XML/1998/namespace';
const colonChar = 58;  // 冒号
const xChar = 120;  // x

/**
 * 更新属性
 */
function updateAttrs(oldVnode: VNode, vnode: VNode): void {
    var key: string,
        elm: Element = vnode.elm as Element,
        oldAttrs = (oldVnode.data as VNodeData).attrs,
        attrs = (vnode.data as VNodeData).attrs;

    if (!oldAttrs && !attrs) return;
    if (oldAttrs === attrs) return;
    oldAttrs = oldAttrs || {};
    attrs = attrs || {};

    // update modified attributes, add new attributes
    // 遍历新的属性，修改不相等的
    for (key in attrs) {
        const cur = attrs[key];
        const old = oldAttrs[key];
        if (old !== cur) {
            if (cur === true) {
                elm.setAttribute(key, '');
            } else if (cur === false) {
                elm.removeAttribute(key);
            } else {
                if (key.charCodeAt(0) !== xChar) {
                    // 如果不是 x 开头
                    elm.setAttribute(key, cur);
                } else if (key.charCodeAt(3) === colonChar) {
                    // Assume xml namespace
                    elm.setAttributeNS(xmlNS, key, cur);
                } else if (key.charCodeAt(5) === colonChar) {
                    // Assume xlink namespace
                    elm.setAttributeNS(xlinkNS, key, cur);
                } else {
                    elm.setAttribute(key, cur);
                }
            }
        }
    }
    // remove removed attributes
    // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
    // the other option is to remove all attributes with value == undefined
    // 删除多余的属性
    for (key in oldAttrs) {
        if (!(key in attrs)) {
            elm.removeAttribute(key);
        }
    }
}

// 创建以及更新的钩子
export const attributesModule = {
    create: updateAttrs,
    update: updateAttrs
} as Module;
export default attributesModule;
