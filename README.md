mini-react 实现了一个非常精简但功能完整的 **Mini-React**，它涵盖了现代 React 的核心精髓：**Fiber 架构、并发模式（Concurrent Mode）、Hooks 机制以及协调（Reconciliation）算法**。

---

### 1. 核心数据结构：Fiber 与双缓存

在早期 React（v15 及以前）中，React 使用的是递归比对虚拟 DOM 树，这个过程是同步且无法中断的，当页面庞大时会导致浏览器掉帧（卡顿）。

为了解决这个问题，你的代码引入了 **Fiber** 架构。

- **Fiber 是什么？** 它既是一种数据结构（代表一个工作单元），也是一种组织树形结构的方式。它将原本的嵌套树状结构打平，通过 `child`（大儿子）、`sibling`（兄弟）、`parent`（父亲）这三个指针，将虚拟 DOM 树转变成了一个可以中断和恢复的**单链表树**。
- **双缓存树（Double Buffering）：** 代码中存在 `currentRoot`（当前屏幕上显示的 Fiber 树）和 `wipRoot`（Work In Progress，正在内存中构建的新 Fiber 树）。通过 `alternate` 属性，新旧 Fiber 节点相互引用，方便进行 Diff 对比。当新树构建完成后，直接替换旧树，这就是“双缓存”。

---

### 2. 调度引擎：时间分片 (Time Slicing)

入口函数 `render` 只是初始化了 `wipRoot` 和 `nextUnitofWork`。真正的引擎是 `workLoop`。

- **`requestIdleCallback` 的妙用：** 这个浏览器 API 会在主线程空闲时调用传入的回调函数，并提供一个 `deadline` 对象。
- **可中断的渲染：** 在 `workLoop` 的 `while` 循环中，每次只执行一个工作单元（`performUnitOfWork`）。执行完后检查 `deadline.timeRemaining() < 1`。如果没有时间了，就暂停当前渲染，把控制权还给浏览器去处理用户的点击、动画等高优先级任务。等浏览器再次空闲，再接着上一次的 `nextUnitofWork` 继续工作。

---

### 3. 构建与遍历机制：工作单元的流转

`performUnitOfWork` 决定了 Fiber 树的构建和遍历顺序，采用的是**深度优先搜索 (DFS)** 的思想：

1. **处理当前节点：** 判断是函数组件（执行函数获取返回值）还是原生 DOM 节点（创建实际 DOM 节点）。
2. **生成子 Fiber 节点：** 调用 `reconcileChildren` 进行 Diff 对比，并建立父子、兄弟关系的指针。
3. **返回下一个工作单元（遍历顺序）：** \* 如果有儿子（`child`），下一个任务就是大儿子。

- 如果没有儿子，找兄弟（`sibling`）。
- 如果没有兄弟，就退回到父亲（`parent`），然后再找父亲的兄弟，以此类推。

---

### 4. 协调与 Diff 算法 (Reconciliation)

`reconcileChildren` 是 React Diff 算法的核心所在。它遍历传入的 `elements`（新的 React 元素）并与 `oldFiber`（旧的 Fiber 节点）进行同层比对。

通过比对 `type`（标签类型或组件函数），它会给每个新创建的 Fiber 打上标签（`effectTag`）：

- **UPDATE (更新)：** 新旧元素 `type` 相同，保留旧 DOM，只更新属性（`props`）。
- **PLACEMENT (新建)：** 新元素存在但旧节点不存在，或者 `type` 不同，需要创建全新的真实 DOM。
- **DELETION (删除)：** 旧节点存在但新元素没有了，或者 `type` 不同旧节点作废。将旧节点放入 `deletions` 数组中，等待统一删除。

---

### 5. 提交阶段 (Commit Phase)

当 `wipRoot` 的所有工作单元都完成（`nextUnitofWork` 为空），进入 `commitRoot` 阶段。

- **为什么需要独立的 Commit 阶段？** Render 阶段是可以被浏览器频繁中断的，如果在这个阶段直接操作真实 DOM，用户就会看到断断续续的 UI 更新。因此，我们将 DOM 变更收集起来，在 Commit 阶段**一口气同步执行完毕**。
- **执行 DOM 操作：** `commitWork` 会递归整棵树，根据之前打上的 `effectTag` (`PLACEMENT`, `UPDATE`, `DELETION`)，调用原生的 `append`, `removeChild` 或你实现的 `updateDOM`（处理属性和事件监听器的绑定与解绑）来修改真实 DOM。

---

### 6. Hooks 的奥秘：闭包与数组

你的代码中实现了 `useState` 和 `useEffect`。这里揭示了 React Hooks 的一个核心真相：**Hooks 是存在数组里的**。

- **执行环境：** 每次渲染函数组件前（`updateFunctionComponent`），会初始化 `wipFiber.hooks = []` 和 `hookIndex = 0`。
- **`useState`：** 当组件调用 `useState` 时，它会去读取当前 `hookIndex` 对应的旧 Hook 数据。`setState` 函数通过闭包记录了当前的 Hook 队列，调用它时会将 `action` 推入队列，并重新触发整个应用的渲染（将 `nextUnitofWork` 设为 `wipRoot`）。
- **`useEffect`：** 它同样按照索引存入数组。比较新旧 `deps` 数组的引用（`Object.is`），如果发生变化，就标记 `hasChanged: true`。在整个 Commit 阶段完成后，`commitEffects` 会专门去遍历执行那些发生了变化的 Effect，并妥善执行上一轮的 `cleanup` 清理函数。
- **为什么 Hooks 不能写在 if 语句里？** 因为你的实现（也是 React 的实现）完全依赖 `hookIndex += 1` 的固定顺序来匹配新旧 Hook 状态。一旦顺序打乱，状态就会串位。
