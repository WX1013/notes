# Git使用指南

## 前言：Git工作原理图

![git-process](https://file.iamwx.cn/images/202211070855828.png)

**Remote Directory**：远程仓库，托管代码的服务器，比如GitHub、Gitee、Gitlab等；

**History/Repository**：仓库区（或本地仓库），就是安全存放数据的位置，这里面有你提交到所有版本的数据。其中HEAD指向最新放入仓库的版本；

**Stage**：暂存区，用于临时存放你的改动，事实上它只是一个文件，保存即将提交到文件列表信息，每次 git add 就是把文件放入暂存区；

**Working Directory**：工作区，就是本地存放项目代码的地方。

## 1、配置SSH（可选，推荐）

> 如果不配置SSH也可以在推送代码到远程仓库时提示输入账号密码进行登录即可


```shell
# 配置当前Git用户信息：如果在项目下执行，后续在提交项目代码会使用在项目中配置的用户信息；同时有全局配置，如果项目未配置，则会使用全局的信息配置提交到Git仓库
git config --global user.name "你的名字"
git config --global user.email "在此输入你的Git邮箱账号"

# 生成SSH
# 在git命令行中输入
ssh-keygen -t rsa -C "用户邮箱"
# 一路回车，生成完成后，在用户根目录下会有 .ssh 文件夹，进入后找到 id_rsa.pub 文件
# 复制文件里的字符串到Gitlab新增一个SSH密钥即可
```

![image-20221105221253295](https://file.iamwx.cn/images/202211052212998.png)

## 2、拉取远程仓库代码

```shell
# 拉取远程仓库代码到本地：默认会拉取主分支代码
git clone [SSH | HTTP 链接]
# 如： git clone git://github.com/username/demo.git git 或 clone https://github.com/username/demo.git

# 拉取远程仓库最新提交
git pull

# 拉取指定分支代码到当期分支：相当于合并其它分支的代码，有时会需要在提交代码前先合并其它分支代码
git pull origin 分支名称
# 如 git pull origin dev
```

## 3、推送本地代码到空的远程仓库

```shell
# 首先在 Gitlab 创建一个空的仓库
# 在本地项目根目录执行以下指令
# 初始化本地 git 仓库
git init

# 将内容从工作目录添加到暂存区：如果只想推送某个文件，可把 . 修改为指定文件
git add .

# 提交到本地仓库
git commit -m "对当前提交内容的描述"

# 关联远程仓库
git remote add origin git://github.com/username/demo.git
# 或者 
git remote add origin https://github.com/username/demo.git

# 推送到远程仓库：指定推送到远程的 master 分支
git push --set-upstream origin master
```

## 4、提交代码

```shell
# 查看当前有改变的文件
git status

# 提交到本地仓库
git add . && git commit -m "提交描述"

# 推送到远程仓库
git push

# 查看刚刚提交的内容
git show
# 或者
git log -n1 -p

# 查看提交记录：按 Q 退出日志查看
git log
# 日志查看简洁版
git log --oneline
```

## 5、commit

### 修改comment

> 注意：只能修改未push到远程仓库的本地最新提交记录

使用场景：上一次的提交描述有错别字或其它原因需要修改

```shell
# 输入此指令，回车后会进入编辑上次comment窗口，修改后保存退出即可
git commit --amend

# 注入此执行，可直接进行修改上次comment内容
git commit --amend -m "新的提交描述"
```

![iShot_2022-11-06_11.14.39](https://file.iamwx.cn/images/202211061116184.gif)

### 合并多个提交

> 注意：仅适应于本地未push的几个commit

使用场景：一个功能需要多天开发，每天下班前把当天的内容提交到本地，等接下来某一天开发完成了，合并这几天的commit为一个再push到远程仓库。

### 示例

* 已经有N个本地提交

![image-20221106112014834](https://file.iamwx.cn/images/202211061120862.png)

* 合并最近的3个提交

```shell
# 其中的3是指定最近的3次提交
git rebase -i HEAD~3
```

执行上述命令后进入下图窗口

![image-20221106112055843](https://file.iamwx.cn/images/202211061120874.png)

* 标记一个为最终提交，标记另外的为被合并提交

英文模式按`i`进入编辑模式，修改后两个修改为`s`，修改后按`Esc`，输入`:wq`进行保存

![image-20221106112213987](https://file.iamwx.cn/images/202211061122022.png)

* 保存后会进入一个输入提交描述的窗口

> 如果未进入这个窗口，并且提示了 interactive rebase in progress; onto xxxxx，按照提示输入 git rebase --continue 继续进行合并

修改后按`Esc`，输入`:wq`进行保存

![image-20221106112421730](https://file.iamwx.cn/images/202211061124765.png)

![image-20221106112503192](https://file.iamwx.cn/images/202211061125232.png)

* 查看合并后的日志

```shell
# 查看日志会发现之前3个commit合并成了一个，且comment也是最后输入的
git log --online
```

## 6、分支管理

```shell
# 查看本地当前分支，同时也可以看到本地的所有分支
git branch

# 查看当前分支和远程分支的关联关系
git branch -vv

# 创建本地分支
git branch 分支名称

# 创建本地分支并切换到新分支
git checkout -b 分支名称

# 删除本地一个分支，会在删除前检查merge状态（其与上游分支或者与head）
git branch -d 分支名称

# 是git branch --delete --force的简写，它会直接删除
git branch -D 分支名称

# 切换本地分支
git checkout 分支名称

# 查看远程所有分支
git branch -r

# 查看本地和远程的所有分支
git branch -a

# 创建远程分支：就是把本地分支推送到远程仓库，需要先切换到当前分支，再执行下面的命令
git push --set-upstream origin 分支名称

# 删除远程分支
git push origin --delete 分支名称

# 用于合并指定分支到当前分支
git merge 分支名称

# 本地分支关联远程已有分支，先切换到要关联的本地分支，然后执行下面指令
git branch --set-upstream-to origin/分支名称

# 或直接合并为一个命令，格式：git checkout -b [branch] [remotename]/[branch]
git checkout -b 本地分支名称 origin/远程分支名称
```

## 7、远程仓库

```shell
# 查看当前已关联的远程仓库
git remote -vv

# 关联新的远程仓库
# 格式git remote add [remotename] [giturl]
git remote add gitee https://gitee.com/username/demo.git

# 进行同步
git fetch gitee

# 拉取新的远程仓库的指定分支
# 格式：git checkout -b [branch] [remotename]/[branch]
git checkout -b gitee-master gitee/master

# 如在gitee远程仓库上有改动，提交代码时如果本地分支名称和远程分支名称不一致，则需要手动指定
# 格式：git push [remotename] HEAD:[branch]
git push gitee HEAD:master

# 如果分支名称一致，则可执行
git push gitee HEAD

# 或 
git push
```

## 8、标签

```shell
# 查看已有tag
git tag

# 添加tag,在添加前，先切换到需要打tag的分支
# 格式：git tag <tagname>
git tag v1.0.0
# 格式：git tag -a <tagname> -m "标签说明"
git tag -a v1.0.1 -m "发布xx版本留存"
# 也可以在新的窗口输入标签说明
git tag -a v1.0.2

# 删除tag
git tag -d v1.0.2

# 推送一个tag到远程仓库，格式：git push <remote_name> <tagname>
git push origin tag v1.0.0

# 推送所有未推送的tag到远程仓库
git push origin --tags

# 删除远程tag，格式：git push <remote_name> :refs/tags/<tagname>（需要先删除本地的tag）
git push origin :refs/tags/v1.0.0
```



## 9、出现的问题

问题打印：`fatal: refusing to merge unrelated histories`

解决方法：在`git merge [branch]`后面增加`--allow-unrelated-histories`即可。

例如：

```shell
git merge master --allow-unrelated-histories
```

同理，在`git pull`时如出现此类错误提示，也可以在命令后面增加` --allow-unrelated-histories`。

例如：

```shell
git pull origin master --allow-unrelated-histories
```

