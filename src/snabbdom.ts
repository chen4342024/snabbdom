/* global module, document, Node */
import { Module } from './modules/module';
import { Hooks } from './hooks';
import vnode, { VNode, VNodeData, Key } from './vnode';
import * as is from './is';
import htmlDomApi, { DOMAPI } from './htmldomapi';

function isUndef(s: any): boolean {
    return s === undefined;
}
function isDef(s: any): boolean {
    return s !== undefined;
}

type VNodeQueue = Array<VNode>;

//空的虚拟DOM节点
const emptyNode = vnode('', {}, [], undefined, undefined);

/**
 *  判断是否是相同的虚拟节点
 */
function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
    return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

/**
 * 判断是否是一个虚拟节点
 */
function isVnode(vnode: any): vnode is VNode {
    return vnode.sel !== undefined;
}

type KeyToIndexMap = { [key: string]: number };

type ArraysOf<T> = { [K in keyof T]: (T[K])[] };

type ModuleHooks = ArraysOf<Module>;

/**
 * 根据 Children 返回一个 key 对应 index 的对象
 */
function createKeyToOldIdx(
    children: Array<VNode>,
    beginIdx: number,
    endIdx: number
): KeyToIndexMap {
    let i: number,
        map: KeyToIndexMap = {},
        key: Key | undefined,
        ch;
    for (i = beginIdx; i <= endIdx; ++i) {
        ch = children[i];
        if (ch != null) {
            key = ch.key;
            if (key !== undefined) map[key] = i;
        }
    }
    return map;
}

// 钩子 ，
const hooks: (keyof Module)[] = [
    'create',
    'update',
    'remove',
    'destroy',
    'pre',
    'post'
];

export { h } from './h';
export { thunk } from './thunk';

/**
 * 初始化
 */
export function init(modules: Array<Partial<Module>>, domApi?: DOMAPI) {
    let i: number,
        j: number,
        cbs = {} as ModuleHooks;

    const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi;

    // 循环 hooks , 将每个 modules 下的 hook 方法提取出来存到 cbs 里面
    // 返回结果 eg ： cbs['create'] = [modules[0]['create'],modules[0]['create'],...];
    for (i = 0; i < hooks.length; ++i) {
        cbs[hooks[i]] = [];
        for (j = 0; j < modules.length; ++j) {
            const hook = modules[j][hooks[i]];
            if (hook !== undefined) {
                (cbs[hooks[i]] as Array<any>).push(hook);
            }
        }
    }

    /**
     * 根据 dom 元素 , 生成一个空的 VNode
     */
    function emptyNodeAt(elm: Element) {
        const id = elm.id ? '#' + elm.id : '';
        const c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
        return vnode(
            api.tagName(elm).toLowerCase() + id + c,
            {},
            [],
            undefined,
            elm
        );
    }

    /**
     * 创建一个删除的回调，多次调用这个回调，直到监听器都没了，就删除元素
     */
    function createRmCb(childElm: Node, listeners: number) {
        return function rmCb() {
            if (--listeners === 0) {
                const parent = api.parentNode(childElm);
                api.removeChild(parent, childElm);
            }
        };
    }

    /**
     *  VNode ==> 真实DOM
     */
    function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
        let i: any,
            data = vnode.data;
        if (data !== undefined) {
            if (isDef((i = data.hook)) && isDef((i = i.init))) {
                i(vnode);
                data = vnode.data;
            }
        }
        let children = vnode.children,
            sel = vnode.sel;
        if (sel === '!') {
            if (isUndef(vnode.text)) {
                vnode.text = '';
            }
            vnode.elm = api.createComment(vnode.text as string);
        } else if (sel !== undefined) {
            // Parse selector
            const hashIdx = sel.indexOf('#');
            const dotIdx = sel.indexOf('.', hashIdx);
            const hash = hashIdx > 0 ? hashIdx : sel.length;
            const dot = dotIdx > 0 ? dotIdx : sel.length;
            const tag =
                hashIdx !== -1 || dotIdx !== -1
                    ? sel.slice(0, Math.min(hash, dot))
                    : sel;
            const elm = (vnode.elm =
                isDef(data) && isDef((i = (data as VNodeData).ns))
                    ? api.createElementNS(i, tag)
                    : api.createElement(tag));
            if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot));
            if (dotIdx > 0)
                elm.setAttribute(
                    'class',
                    sel.slice(dot + 1).replace(/\./g, ' ')
                );
            for (i = 0; i < cbs.create.length; ++i)
                cbs.create[i](emptyNode, vnode);
            if (is.array(children)) {
                for (i = 0; i < children.length; ++i) {
                    const ch = children[i];
                    if (ch != null) {
                        api.appendChild(
                            elm,
                            createElm(ch as VNode, insertedVnodeQueue)
                        );
                    }
                }
            } else if (is.primitive(vnode.text)) {
                api.appendChild(elm, api.createTextNode(vnode.text));
            }
            i = (vnode.data as VNodeData).hook; // Reuse variable
            if (isDef(i)) {
                if (i.create) i.create(emptyNode, vnode);
                if (i.insert) insertedVnodeQueue.push(vnode);
            }
        } else {
            vnode.elm = api.createTextNode(vnode.text as string);
        }
        return vnode.elm;
    }

    /**
     * 添加 Vnodes 到 真实 DOM 中
     */
    function addVnodes(
        parentElm: Node,
        before: Node | null,
        vnodes: Array<VNode>,
        startIdx: number,
        endIdx: number,
        insertedVnodeQueue: VNodeQueue
    ) {
        for (; startIdx <= endIdx; ++startIdx) {
            const ch = vnodes[startIdx];
            if (ch != null) {
                api.insertBefore(
                    parentElm,
                    createElm(ch, insertedVnodeQueue),
                    before
                );
            }
        }
    }

    /**
     * 调用 destroy hook ， 循环调用 VNode 以及 VNode 下的 children
     */
    function invokeDestroyHook(vnode: VNode) {
        let i: any,
            j: number,
            data = vnode.data;
        if (data !== undefined) {
            if (isDef((i = data.hook)) && isDef((i = i.destroy))) i(vnode);
            for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
            if (vnode.children !== undefined) {
                for (j = 0; j < vnode.children.length; ++j) {
                    i = vnode.children[j];
                    if (i != null && typeof i !== 'string') {
                        invokeDestroyHook(i);
                    }
                }
            }
        }
    }

    /**
     * 删除 VNodes
     */
    function removeVnodes(
        parentElm: Node,
        vnodes: Array<VNode>,
        startIdx: number,
        endIdx: number
    ): void {
        for (; startIdx <= endIdx; ++startIdx) {
            let i: any,
                listeners: number,
                rm: () => void,
                ch = vnodes[startIdx];
            if (ch != null) {
                if (isDef(ch.sel)) {
                    invokeDestroyHook(ch);
                    listeners = cbs.remove.length + 1;
                    // 所有监听删除
                    rm = createRmCb(ch.elm as Node, listeners);

                    // 如果有钩子则调用钩子后再掉删除回调，如果没，则直接调用回调
                    for (i = 0; i < cbs.remove.length; ++i)
                        cbs.remove[i](ch, rm);


                    if (
                        isDef((i = ch.data)) &&
                        isDef((i = i.hook)) &&
                        isDef((i = i.remove))
                    ) {
                        i(ch, rm);
                    } else {
                        rm();
                    }
                } else {
                    // Text node
                    api.removeChild(parentElm, ch.elm as Node);
                }
            }
        }
    }

    /**
     * 更新子节点
     */
    function updateChildren(
        parentElm: Node,
        oldCh: Array<VNode>,
        newCh: Array<VNode>,
        insertedVnodeQueue: VNodeQueue
    ) {
        let oldStartIdx = 0,
            newStartIdx = 0;

        let oldEndIdx = oldCh.length - 1;

        let oldStartVnode = oldCh[0];
        let oldEndVnode = oldCh[oldEndIdx];

        let newEndIdx = newCh.length - 1;

        let newStartVnode = newCh[0];
        let newEndVnode = newCh[newEndIdx];

        let oldKeyToIdx: any;
        let idxInOld: number;
        let elmToMove: VNode;
        let before: any;

        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (oldStartVnode == null) {
                // 移动索引，因为节点处理过了会置空，所以这里向右移
                oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
            } else if (oldEndVnode == null) {
                // 原理同上
                oldEndVnode = oldCh[--oldEndIdx];
            } else if (newStartVnode == null) {
                // 原理同上
                newStartVnode = newCh[++newStartIdx];
            } else if (newEndVnode == null) {
                // 原理同上
                newEndVnode = newCh[--newEndIdx];
            } else if (sameVnode(oldStartVnode, newStartVnode)) {
                // 从左对比
                patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            } else if (sameVnode(oldEndVnode, newEndVnode)) {
                // 从右对比
                patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            } else if (sameVnode(oldStartVnode, newEndVnode)) {
                // Vnode moved right
                // 最左侧 对比 最右侧
                patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
                api.insertBefore(
                    parentElm,
                    oldStartVnode.elm as Node,
                    api.nextSibling(oldEndVnode.elm as Node)
                );
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            } else if (sameVnode(oldEndVnode, newStartVnode)) {
                // Vnode moved left
                // 最右侧对比最左侧
                patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
                api.insertBefore(
                    parentElm,
                    oldEndVnode.elm as Node,
                    oldStartVnode.elm as Node
                );
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            } else {
                // 首尾都不一样的情况，寻找相同 key 的节点，所以使用的时候加上key可以调高效率
                if (oldKeyToIdx === undefined) {
                    oldKeyToIdx = createKeyToOldIdx(
                        oldCh,
                        oldStartIdx,
                        oldEndIdx
                    );
                }
                idxInOld = oldKeyToIdx[newStartVnode.key as string];

                if (isUndef(idxInOld)) {
                    // New element
                    // 如果找不到 key 对应的元素，就新建元素
                    api.insertBefore(
                        parentElm,
                        createElm(newStartVnode, insertedVnodeQueue),
                        oldStartVnode.elm as Node
                    );
                    newStartVnode = newCh[++newStartIdx];
                } else {
                    // 如果找到 key 对应的元素，就移动元素
                    elmToMove = oldCh[idxInOld];
                    if (elmToMove.sel !== newStartVnode.sel) {
                        api.insertBefore(
                            parentElm,
                            createElm(newStartVnode, insertedVnodeQueue),
                            oldStartVnode.elm as Node
                        );
                    } else {
                        patchVnode(
                            elmToMove,
                            newStartVnode,
                            insertedVnodeQueue
                        );
                        oldCh[idxInOld] = undefined as any;
                        api.insertBefore(
                            parentElm,
                            elmToMove.elm as Node,
                            oldStartVnode.elm as Node
                        );
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
            }
        }
        // 新老数组其中一个到达末尾
        if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
            if (oldStartIdx > oldEndIdx) {
                // 如果老数组先到达末尾，说明新数组还有更多的元素，这些元素都是新增的，说以一次性插入
                before =
                    newCh[newEndIdx + 1] == null
                        ? null
                        : newCh[newEndIdx + 1].elm;
                addVnodes(
                    parentElm,
                    before,
                    newCh,
                    newStartIdx,
                    newEndIdx,
                    insertedVnodeQueue
                );
            } else {
                // 如果新数组先到达末尾，说明新数组比老数组少了一些元素，所以一次性删除
                removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
            }
        }
    }

    /**
     * 更新节点
     */
    function patchVnode(
        oldVnode: VNode,
        vnode: VNode,
        insertedVnodeQueue: VNodeQueue
    ) {
        let i: any, hook: any;
        // 调用 prepatch 回调
        if (
            isDef((i = vnode.data)) &&
            isDef((hook = i.hook)) &&
            isDef((i = hook.prepatch))
        ) {
            i(oldVnode, vnode);
        }

        // 调用 cbs 中的回调
        const elm = (vnode.elm = oldVnode.elm as Node);
        let oldCh = oldVnode.children;
        let ch = vnode.children;
        if (oldVnode === vnode) return;

        if (vnode.data !== undefined) {
            for (i = 0; i < cbs.update.length; ++i)
                cbs.update[i](oldVnode, vnode);

            i = vnode.data.hook;
            if (isDef(i) && isDef((i = i.update))) i(oldVnode, vnode);
        }

        if (isUndef(vnode.text)) {
            if (isDef(oldCh) && isDef(ch)) {
                // 新老子节点都存在的情况，更新 子节点
                if (oldCh !== ch)
                    updateChildren(
                        elm,
                        oldCh as Array<VNode>,
                        ch as Array<VNode>,
                        insertedVnodeQueue
                    );
            } else if (isDef(ch)) {
                // 老节点不存在子节点，情况下，新建元素
                if (isDef(oldVnode.text)) api.setTextContent(elm, '');
                addVnodes(
                    elm,
                    null,
                    ch as Array<VNode>,
                    0,
                    (ch as Array<VNode>).length - 1,
                    insertedVnodeQueue
                );
            } else if (isDef(oldCh)) {
                // 新节点不存在子节点，情况下，删除元素
                removeVnodes(
                    elm,
                    oldCh as Array<VNode>,
                    0,
                    (oldCh as Array<VNode>).length - 1
                );
            } else if (isDef(oldVnode.text)) {
                // 如果老节点存在文本节点，新节点不存在，所以清空
                api.setTextContent(elm, '');
            }
        } else if (oldVnode.text !== vnode.text) {
            // 子节点文本不一样的情况下，更新文本
            api.setTextContent(elm, vnode.text as string);
        }

        // 调用 postpatch
        if (isDef(hook) && isDef((i = hook.postpatch))) {
            i(oldVnode, vnode);
        }
    }

    /**
     * 修补节点
     */
    return function patch(oldVnode: VNode | Element, vnode: VNode): VNode {
        let i: number, elm: Node, parent: Node;
        const insertedVnodeQueue: VNodeQueue = [];

        // 先调用 pre 回调
        for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

        // 如果老节点非 vnode ， 则创建一个空的 vnode
        if (!isVnode(oldVnode)) {
            oldVnode = emptyNodeAt(oldVnode);
        }

        // 如果是同个节点，则进行修补
        if (sameVnode(oldVnode, vnode)) {
            patchVnode(oldVnode, vnode, insertedVnodeQueue);
        } else {

            // 不同 Vnode 节点则新建
            elm = oldVnode.elm as Node;
            parent = api.parentNode(elm);

            createElm(vnode, insertedVnodeQueue);

            // 插入新节点，删除老几点
            if (parent !== null) {
                api.insertBefore(
                    parent,
                    vnode.elm as Node,
                    api.nextSibling(elm)
                );
                removeVnodes(parent, [oldVnode], 0, 0);
            }
        }

        // 调用插入的钩子
        for (i = 0; i < insertedVnodeQueue.length; ++i) {
            (((insertedVnodeQueue[i].data as VNodeData).hook as Hooks)
                .insert as any)(insertedVnodeQueue[i]);
        }
        // 调用post的钩子
        for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();

        return vnode;
    };
}
