# k8s使用nfs存储

## 1、安装nfs服务器

> 本章节中所有命令都以 root 身份执行

- 执行以下命令安装 nfs 服务器所需的软件包

  ```shell
  yum install -y rpcbind nfs-utils
  ```

- 执行命令

  ```shell
  vim /etc/exports
  ```

  创建 exports 文件，文件内容如下：

  ```shell
  /home/nfs_root/ *(insecure,rw,sync,no_root_squash)
  ```

- 执行以下命令，启动 nfs 服务

  ```sh
  # 创建共享目录，如果要使用自己的目录，请替换本文档中所有的 /home/nfs_root/
  mkdir /home/nfs_root
  
  systemctl enable rpcbind
  systemctl enable nfs-server
  
  systemctl start rpcbind
  systemctl start nfs-server
  exportfs -r
  ```

- 检查配置是否生效

  ```shell
  exportfs
  # 输出结果如下所示
  /home/nfs_root /home/nfs_root
  ```

## 2、在客户端测试nfs

> 需要在另一台服务上执行下面的指令。
>
> 本章节中所有命令都以 root 身份执行；
>
> 服务器端防火墙开放111、662、875、892、2049的 tcp / udp 允许，否则远端客户无法连接。

- 执行以下命令安装 nfs 客户端所需的软件包

  ```shell
  yum install -y nfs-utils
  ```

- 执行以下命令检查 nfs 服务器端是否有设置共享目录

  ```shell
  ·# showmount -e $(nfs服务器的IP)
  showmount -e 172.16.1.245
  # 输出结果如下所示
  Export list for 172.16.1.245:
  /home/nfs_root *
  ```

- 执行以下命令挂载 nfs 服务器上的共享目录到本机路径 `/home/nfsmount`

  ```shell
  mkdir /home/nfsmount
  # mount -t nfs $(nfs服务器的IP):/home/nfs_root /home/nfsmount
  mount -t nfs 172.16.1.245:/home/nfs_root /home/nfsmount
  # 写入一个测试文件
  echo "hello nfs server" > /home/nfsmount/test.txt
  ```

- 在 nfs 服务器上执行以下命令，验证文件写入成功

  ```sh
  cat /home/nfs_root/test.txt
  ```

* 测试完成后取消挂载

  ```sh
  umount /home/nfsmount
  ```

## 3、k8s中集成nfs

* 所有的集群节点安装nfs

  ```shell
  yum install nfs-utils -y 
  ```

* 创建