import vnode, { VNode } from './vnode';
import htmlDomApi, { DOMAPI } from './htmldomapi';


// 这个函数主要功能是 DOM 元素 ===> VNode
export function toVNode(node: Node, domApi?: DOMAPI): VNode {
    const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;
    let text: string;

    if (api.isElement(node)) {
        // 处理元素
        const id = node.id ? '#' + node.id : '';
        const cn = node.getAttribute('class');
        const c = cn ? '.' + cn.split(' ').join('.') : '';
        // 拼接选择器
        const sel = api.tagName(node).toLowerCase() + id + c;
        const attrs: any = {};
        const children: Array<VNode> = [];
        let name: string;
        let i: number, n: number;

        const elmAttrs = node.attributes;
        const elmChildren = node.childNodes;
        // 将元素的属性全部赋值给 attrs ，除了 id 和 class
        for (i = 0, n = elmAttrs.length; i < n; i++) {
            name = elmAttrs[i].nodeName;
            if (name !== 'id' && name !== 'class') {
                attrs[name] = elmAttrs[i].nodeValue;
            }
        }
        // 将所有子元素都赋值给children
        for (i = 0, n = elmChildren.length; i < n; i++) {
            // 并且将子元素也转为vnode对象
            children.push(toVNode(elmChildren[i], domApi));
        }
        // 返回 根据选择器、属性、子元素生成的 vnode 对象，
        // 不过这里为何text传的参数是undefined，如果一个div里包含文本，这样处理岂不是会忽略掉？
        // vnode 的 children/text 二选一，不可共存。那为什么不把 text 视为 children 的一个元素 ？主要是方便处理，text 节点和其它类型的节点处理起来差异很大。
        // 可以这样理解，有了 text 代表该 vnode 其实是 VTextNode，仅仅是 snabbdom 没有对 vnode 区分而已。
        // elm 用于保存 vnode 对应 DOM 节点。
        return vnode(sel, { attrs }, children, undefined, node);
    } else if (api.isText(node)) {
        // 处理文本
        text = api.getTextContent(node) as string;
        return vnode(undefined, undefined, undefined, text, node);
    } else if (api.isComment(node)) {
        // 处理注释
        text = api.getTextContent(node) as string;
        return vnode('!', {}, [], text, node as any);
    } else {
        // 处理空的状况
        return vnode('', {}, [], undefined, node as any);
    }
}

export default toVNode;
