# 使用二进制方式安装高可用k8s

> 😁整个过程相对kubeadmin复杂，但好处是能真切了解到各组件，耐心按照步骤进行，有问题针对日志查解决办法即可。

| 应用       | 版本     |
| ---------- | -------- |
| docker     | v20.10.7 |
| kubernetes | v1.20.15 |
| Calico     | v3.22    |
| CoreDNS    | v1.8     |
| haproxy    | v1.5.18  |
| keepalived | v1.3.5   |

## 1、服务器准备

> 当前使用的是虚拟机新建的Centos7的虚拟机，需要**将IP固定**

| 名称          | IP            | 配置               |
| ------------- | ------------- | ------------------ |
| k8s-master-01 | 192.168.18.11 | 2C 2G 40G Cenos7.8 |
| k8s-master-02 | 192.168.18.12 | 2C 2G 40G Cenos7.8 |
| k8s-node-01   | 192.168.18.13 | 2C 2G 40G Cenos7.8 |
| k8s-node-02   | 192.168.18.14 | 2C 2G 40G Cenos7.8 |
| VIP           | 192.168.18.10 |                    |

> 可先把以上几个IP全局替换为自己的IP地址
>
> 192.168.18.11 -> 你的masterIP
>
> ...
>
> IP替换完还需要替换 `192.168.18.` 为你当前的IP段
>
> 替换完后，接下来的都可直接进行复制粘贴进行操作，进行过程中还需要注意有些是后面的 11、12、13、14

固定IP（以k8s-master-01示例）

```shell
[root@localhost ~]# vi /etc/sysconfig/network-scripts/ifcfg-ens33
# 原内容
TYPE="Ethernet"
PROXY_METHOD="none"
BROWSER_ONLY="no"
BOOTPROTO="dhcp"
DEFROUTE="yes"
IPV4_FAILURE_FATAL="no"
IPV6INIT="yes"
IPV6_AUTOCONF="yes"
IPV6_DEFROUTE="yes"
IPV6_FAILURE_FATAL="no"
IPV6_ADDR_GEN_MODE="stable-privacy"
NAME="ens33"
UUID="fd77f205-4e0a-433a-9b86-4b5df02b6115"
DEVICE="ens33"
ONBOOT="yes"

# 修改后
TYPE="Ethernet"
PROXY_METHOD="none"
BROWSER_ONLY="no"
BOOTPROTO="static"
DEFROUTE="yes"
IPV4_FAILURE_FATAL="no"
IPV6INIT="yes"
IPV6_AUTOCONF="yes"
IPV6_DEFROUTE="yes"
IPV6_FAILURE_FATAL="no"
IPV6_ADDR_GEN_MODE="stable-privacy"
NAME="ens33"
UUID="fd77f205-4e0a-433a-9b86-4b5df02b6115"
DEVICE="ens33"
ONBOOT="yes"
IPADDR="192.168.18.10"
NETMASK="255.255.255.0"
GATEWAY="192.168.18.2"
DNS1="114.114.114.114"
DNS2="8.8.8.8"

# 重启网络服务
[root@localhost ~]# systemctl restart network

# 查看当前网络IP
[root@k8s-master-01 ~]# ifconfig -a
ens33: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.18.11  netmask 255.255.255.0  broadcast 192.168.18.255
        inet6 fe80::8f0e:81ab:7454:4907  prefixlen 64  scopeid 0x20<link>
        ether 00:0c:29:aa:e6:95  txqueuelen 1000  (Ethernet)
        RX packets 10399  bytes 838024 (818.3 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 14742  bytes 2848636 (2.7 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

# 测试网络是否正常
[root@k8s-master-01 ~]# ping www.baidu.com
PING www.baidu.com (36.152.44.95) 56(84) bytes of data.
64 bytes from 36.152.44.95 (36.152.44.95): icmp_seq=1 ttl=128 time=11.8 ms
64 bytes from 36.152.44.95 (36.152.44.95): icmp_seq=2 ttl=128 time=32.8 ms
64 bytes from 36.152.44.95 (36.152.44.95): icmp_seq=3 ttl=128 time=20.2 ms
64 bytes from 36.152.44.95 (36.152.44.95): icmp_seq=4 ttl=128 time=15.0 ms
```

修改系统的启动内核

```shell
# 查看当前使用内核
[root@localhost ~]# grub2-editenv list
saved_entry=BigCloud Enterprise Linux (3.10.0-1127.19.1.el7.x86_64) 7.8 (Core)
# 列出已有内核
[root@localhost ~]# cat /boot/grub2/grub.cfg | grep menuentry
if [ x"${feature_menuentry_id}" = xy ]; then
  menuentry_id_option="--id"
  menuentry_id_option=""
export menuentry_id_option
menuentry 'BigCloud Enterprise Linux (5.4.18-200.el7.bclinux.x86_64) 7.8 (Core)' --class bigcloud --class gnu-linux --class gnu --class os --unrestricted $menuentry_id_option 'gnulinux-5.4.18-200.el7.bclinux.x86_64-advanced-143ea821-59dd-445c-8a1f-d98def7797b9' {
menuentry 'BigCloud Enterprise Linux (3.10.0-1127.19.1.el7.x86_64) 7.8 (Core)' --class bigcloud --class gnu-linux --class gnu --class os --unrestricted $menuentry_id_option 'gnulinux-3.10.0-1127.19.1.el7.x86_64-advanced-143ea821-59dd-445c-8a1f-d98def7797b9' {
menuentry 'BigCloud Enterprise Linux (0-rescue-6d81d82de8ed4315af6d9b7c7cea02f5) 7.8 (Core)' --class bigcloud --class gnu-linux --class gnu --class os --unrestricted $menuentry_id_option 'gnulinux-0-rescue-6d81d82de8ed4315af6d9b7c7cea02f5-advanced-143ea821-59dd-445c-8a1f-d98def7797b9' {
# 切换启动内核
[root@localhost ~]# grub2-set-default 'BigCloud Enterprise Linux (5.4.18-200.el7.bclinux.x86_64) 7.8 (Core)'
[root@localhost ~]# grub2-editenv list
saved_entry=BigCloud Enterprise Linux (5.4.18-200.el7.bclinux.x86_64) 7.8 (Core)
```

> 如果使用的ios镜像是别的，且内核没有高版本的，可自行安装升级

```shell
# 如果使用的同样是大云虚拟机，则需要修改配置文件，将enabled修改为0
vi /etc/yum/pluginconf.d/license-manager.conf
```



## 2、服务器初始化配置

### 2.1 关闭防火墙（所有服务器执行）

```shell
# 关闭防火墙、永久关闭
systemctl stop firewalld && systemctl disable firewalld
```

### 2.2 修改主机名（所有服务器执行）

```shell
# 在对应的机器上分别执行以下命令
hostnamectl set-hostname k8s-master-01
hostnamectl set-hostname k8s-master-02
hostnamectl set-hostname k8s-node-01
hostnamectl set-hostname k8s-node-02
```

### 2.3 配置hosts文件（所有服务器执行）

```shell
# 所有都执行
[root@k8s-master-01 ~]# vi /etc/hosts
# 在最后换行追加以下内容
192.168.18.11 k8s-master-01
192.168.18.12 k8s-master-02
192.168.18.13 k8s-node-01
192.168.18.14 k8s-node-02
```

### 2.4 配置主机之间免密登陆 (k8s-master-01节点执行)

```shell
# 生成证书
[root@k8s-master-01 ~]# ssh-keygen -t dsa
Generating public/private dsa key pair.
Enter file in which to save the key (/root/.ssh/id_dsa): 
Created directory '/root/.ssh'.
Enter passphrase (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in /root/.ssh/id_dsa.
Your public key has been saved in /root/.ssh/id_dsa.pub.
The key fingerprint is:
SHA256:/SooB3O+sALi16h35DDcxwhhM8JBcYbbGu6e97oxo0w root@k8s-master-01
The key's randomart image is:
+---[DSA 1024]----+
|o++o             |
| +o=             |
|  = +            |
| o o     .       |
|. + o o S .      |
|oo +o+.o   .     |
|+E +O=..    .    |
|oo+==*+ .  .     |
|.*=+*+.. ..      |
+----[SHA256]-----+
# 设置k8s-master-02
[root@k8s-master-01 ~]# ssh-copy-id k8s-master-02啊
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_dsa.pub"
The authenticity of host 'k8s-master-02 (192.168.18.12)' can't be established.
ECDSA key fingerprint is SHA256:Y18ywXxWlBBy48T3EIXIvpbEiW2SvrV4XTTcTtW3KQY.
ECDSA key fingerprint is MD5:3d:ee:74:ff:95:c5:1b:5d:78:2b:32:7e:41:c8:06:df.
Are you sure you want to continue connecting (yes/no)? yes
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
root@k8s-master-02's password: 

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'k8s-master-02'"
and check to make sure that only the key(s) you wanted were added.
# 设置k8s-node-01
[root@k8s-master-01 ~]# ssh-copy-id k8s-node-01
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_dsa.pub"
The authenticity of host 'k8s-node-01 (192.168.18.13)' can't be established.
ECDSA key fingerprint is SHA256:i3S8UR/bPPIhwyX949chCaWgtrr9BA+GP8vzA+LW5v0.
ECDSA key fingerprint is MD5:b5:48:42:f1:c0:4e:c1:3e:b8:70:fb:fd:72:48:e9:97.
Are you sure you want to continue connecting (yes/no)? yes
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
root@k8s-node-01's password: 

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'k8s-node-01'"
and check to make sure that only the key(s) you wanted were added.
# 设置k8s-node-02
[root@k8s-master-01 ~]# ssh-copy-id k8s-node-02
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_dsa.pub"
The authenticity of host 'k8s-node-02 (192.168.18.14)' can't be established.
ECDSA key fingerprint is SHA256:MCmqUOT9FqlM6Pq6MWeS+xovZ4AUQi8O45hVyckz/xo.
ECDSA key fingerprint is MD5:2d:28:f3:07:3f:3d:1e:39:f9:eb:22:76:07:fd:1d:d6.
Are you sure you want to continue connecting (yes/no)? yes
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
root@k8s-node-02's password: 

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'k8s-node-02'"
and check to make sure that only the key(s) you wanted were added.
# 验证 k8s-master-02
[root@k8s-master-01 ~]# ssh root@k8s-master-02 123
bash: 123: 未找到命令
```

### 2.5 修改内核参数（所有服务器执行）

> 官网描述如下
>
> Make sure that the `br_netfilter` module is loaded. This can be done by running `lsmod | grep br_netfilter`. To load it explicitly call `sudo modprobe br_netfilter`.
>
> As a requirement for your Linux Node's iptables to correctly see bridged traffic, you should ensure `net.bridge.bridge-nf-call-iptables` is set to 1 in your `sysctl` config, e.g.

```shell
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
br_netfilter
EOF

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

# 增加配置内容
vi /etc/sysctl.conf
# 在 /etc/sysctl.conf 最后追加
kernel.shmmax = 8393754624
kernel.shmall = 2097152
kernel.pid_max = 65535
net.ipv4.neigh.default.gc_thresh1 = 4096
net.ipv4.neigh.default.gc_thresh2 = 8192
net.ipv4.neigh.default.gc_thresh3 = 8192
kernel.shmmni = 4096
kernel.sem = 250 32000 100 128
kernel.shmmni = 4096
kernel.sem = 250 32000 100 128
fs.aio-max-nr = 1048576
fs.file-max = 6815744
net.ipv4.ip_local_port_range = 9000 65500
net.core.rmem_default = 262144
net.core.rmem_max = 4194304
net.core.wmem_default = 262144
net.core.wmem_max = 1048586
net.ipv4.ip_forward=1

# 配置生效
sudo sysctl --system
```

### 2.6 关闭交换分区 swap，提升性能（所有服务器执行）

```shell
# 临时关闭
swapoff -a

# 永久关闭
vi /etc/fstab
# 注释swap那一行

```

> 关闭原因
> Swap 是交换分区，如果机器内存不够，会使用 swap 分区，但是 swap 分区的性能较低，k8s 设计的时候为了能提升性能，默认是不允许使用姜欢分区的。Kubeadm 初始化的时候会检测 swap 是否关闭，如果没关闭，那就初始化失败。如果不想要关闭交换分区，安装 k8s 的时候可以指定--ignore-preflight-errors=Swap 来解决。

### 2.7 关闭selinux（所有服务器执行）

```shell
# 修改配置文件，下次重启依然是关闭
sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config
# 临时关闭
setenforce 0

# 实操打印内容
[root@k8s-master-01 ~]# cat /etc/sysconfig/selinux
# This file controls the state of SELinux on the system.
# SELINUX= can take one of these three values:
#     enforcing - SELinux security policy is enforced.
#     permissive - SELinux prints warnings instead of enforcing.
#     disabled - No SELinux policy is loaded.
SELINUX=enforcing
# SELINUXTYPE= can take one of three values:
#     targeted - Targeted processes are protected,
#     minimum - Modification of targeted policy. Only selected processes are protected. 
#     mls - Multi Level Security protection.
SELINUXTYPE=targeted 
[root@k8s-master-01 ~]# setenforce 0
[root@k8s-master-01 ~]# sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config
[root@k8s-master-01 ~]# cat /etc/sysconfig/selinux
# This file controls the state of SELinux on the system.
# SELINUX= can take one of these three values:
#     enforcing - SELinux security policy is enforced.
#     permissive - SELinux prints warnings instead of enforcing.
#     disabled - No SELinux policy is loaded.
SELINUX=disabled
# SELINUXTYPE= can take one of three values:
#     targeted - Targeted processes are protected,
#     minimum - Modification of targeted policy. Only selected processes are protected. 
#     mls - Multi Level Security protection.
SELINUXTYPE=targeted
```

### 2.8 配置时间同步（所有服务器执行）

```shell
# 查看 chronyd 状态
[root@k8s-master-02 ~]# systemctl status chronyd
● chronyd.service - NTP client/server
   Loaded: loaded (/usr/lib/systemd/system/chronyd.service; enabled; vendor preset: enabled)
   Active: active (running) since 三 2022-08-10 15:12:38 CST; 7h ago
     Docs: man:chronyd(8)
           man:chrony.conf(5)
 Main PID: 718 (chronyd)
   CGroup: /system.slice/chronyd.service
           └─718 /usr/sbin/chronyd

8月 10 17:20:30 localhost.localdomain chronyd[718]: Source 119.28.183.184 offline
8月 10 17:20:30 localhost.localdomain chronyd[718]: Source 84.16.73.33 offline
8月 10 17:20:30 localhost.localdomain chronyd[718]: Source 193.182.111.12 offline
8月 10 17:20:30 localhost.localdomain chronyd[718]: Source 202.112.29.82 offline
8月 10 17:20:30 localhost.localdomain chronyd[718]: Can't synchronise: no selectable sources
8月 10 17:20:31 localhost.localdomain chronyd[718]: Source 119.28.183.184 online
8月 10 17:20:31 localhost.localdomain chronyd[718]: Source 84.16.73.33 online
8月 10 17:20:31 localhost.localdomain chronyd[718]: Source 202.112.29.82 online
8月 10 17:20:31 localhost.localdomain chronyd[718]: Source 193.182.111.12 online
8月 10 17:24:06 k8s-master-02 chronyd[718]: Selected source 202.112.29.82

[root@k8s-master-02 ~]# chronyc sources -v
210 Number of sources = 4

  .-- Source mode  '^' = server, '=' = peer, '#' = local clock.
 / .- Source state '*' = current synced, '+' = combined , '-' = not combined,
| /   '?' = unreachable, 'x' = time may be in error, '~' = time too variable.
||                                                 .- xxxx [ yyyy ] +/- zzzz
||      Reachability register (octal) -.           |  xxxx = adjusted offset,
||      Log2(Polling interval) --.      |          |  yyyy = measured offset,
||                                \     |          |  zzzz = estimated error.
||                                 |    |           \
MS Name/IP address         Stratum Poll Reach LastRx Last sample               
===============================================================================
^- ntp1.flashdance.cx            2  10   275   31m   -116us[-1120us] +/-  216ms
^+ 119.28.183.184                2  10   367   813   +210us[ +210us] +/-   64ms
^* dns1.synet.edu.cn             2  10   377   823  -1330us[-1984us] +/-   28ms
^- tick.ntp.infomaniak.ch        1  10   377   853  +8194us[+7542us] +/-  131ms

# 查看当前时间
[root@k8s-master-02 ~]# date
2022年 08月 10日 星期三 22:51:08 CST
```

### 2.9 开启ipvs（所有服务器执行）

```shell
# 每次开机都会加载这些模块 (EOF前面反斜杠是防止变量替换用的)
cat > /etc/sysconfig/modules/ipvs.modules << \EOF
#!/bin/bash
ipvs_modules="ip_vs ip_vs_lc ip_vs_wlc ip_vs_rr ip_vs_wrr ip_vs_lblc ip_vs_lblcr ip_vs_dh ip_vs_sh ip_vs_nq ip_vs_sed ip_vs_ftp nf_conntrack"
for kernel_module in ${ipvs_modules}; do
 /sbin/modinfo -F filename ${kernel_module} > /dev/null 2>&1
 if [ 0 -eq 0 ]; then
 /sbin/modprobe ${kernel_module}
 fi
done
EOF

chmod 755 /etc/sysconfig/modules/ipvs.modules && bash /etc/sysconfig/modules/ipvs.modules
```

> 问题 1：ipvs 是什么？
>
> ipvs (IP Virtual Server) 实现了传输层负载均衡，也就是我们常说的 4 层 LAN 交换，作为 Linux 内核的一部分。ipvs 运行在主机上，在真实服务器集群前充当负载均衡器。ipvs 可以将基于 TCP 和 UDP的服务请求转发到真实服务器上，并使真实服务器的服务在单个 IP 地址上显示为虚拟服务。
>
> 问题 2：ipvs 和 iptable 对比分析 
>
> kube-proxy 支持 iptables 和 ipvs 两种模式， 在 kubernetes v1.8 中引入了 ipvs 模式，在 v1.9 中处于 beta 阶段，在 v1.11 中已经正式可用了。iptables 模式在 v1.1 中就添加支持了，从 v1.2 版本开始 iptables 就是 kube-proxy 默认的操作模式，ipvs 和 iptables 都是基于 netfilter的，但是 ipvs 采用的是 hash 表，因此当 service 数量达到一定规模时，hash 查表的速度优势就会显现出来，从而提高 service 的服务性能。那么 ipvs 模式和 iptables 模式之间有哪些差异呢？ 
>
> 1、ipvs 为大型集群提供了更好的可扩展性和性能 
>
> 2、ipvs 支持比 iptables 更复杂的复制均衡算法（最小负载、最少连接、加权等等）
>
> 3、ipvs 支持服务器健康检查和连接重试等功能

## 3、生成自签CA（在k8s-master01节点执行）

> 当前选择在k8s-master-01执行

### 3.1 准备cfssl工具

```shell
# 原链接下载不下来，保存到了OSS
# wget https://pkg.cfssl.org/R1.2/cfssl_linux-amd64
wget https://file.iamwx.cn/study/cfssl_linux-amd64
# wget https://pkg.cfssl.org/R1.2/cfssljson_linux-amd64
wget https://file.iamwx.cn/study/cfssljson_linux-amd64
# wget https://pkg.cfssl.org/R1.2/cfssl-certinfo_linux-amd64
wget https://file.iamwx.cn/study/cfssl-certinfo_linux-amd64

chmod +x cfssl_linux-amd64 cfssljson_linux-amd64 cfssl-certinfo_linux-amd64
mv cfssl_linux-amd64 /usr/local/bin/cfssl
mv cfssljson_linux-amd64 /usr/local/bin/cfssljson
mv cfssl-certinfo_linux-amd64 /usr/bin/cfssl-certinfo
```

### 3.2 建立工作目录

```shell
mkdir -p ~/TLS/{etcd,k8s}
cd ~/TLS/etcd
```

### 3.3 创建ca请求文件

```shell
cat > ca-csr.json <<EOF
{
    "CN": "etcd CA",
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "Beijing",
            "ST": "Beijing",
            "O": "k8s"
        }
    ]
}
EOF
```

> 注：
> CN：Common Name（公用名称），kube-apiserver 从证书中提取该字段作为请求的用户名 (User Name)；浏览器使用该字段验证网站是否合法；
> 对于 SSL 证书，一般为网站域名
> 对于代码签名证书则为申请单位名称
> 对于客户端证书则为证书申请者的姓名。
>
> O：Organization（单位名称），kube-apiserver 从证书中提取该字段作为请求用户所属的组 (Group)；
> 对于 SSL 证书，一般为网站域名
> 对于代码签名证书则为申请单位名称
> 对于客户端单位证书则为证书申请者所在单位名称。
>
> L 字段：所在城市
> S 字段：所在省份
> C 字段：只能是国家字母缩写，如中国：CN

### 3.4 生成CA

```shell
cfssl gencert -initca ca-csr.json | cfssljson -bare ca
# 生成ca.pem和ca-key.pem文件
```

### 3.5 创建CA证书配置文件

```shell
cat > ca-config.json <<EOF
{
  "signing": {
    "default": {
      "expiry": "876000h"
    },
    "profiles": {
      "kubernetes": {
         "expiry": "876000h",
         "usages": [
            "signing",
            "key encipherment",
            "server auth",
            "client auth"
        ]
      }
    }
  }
}
EOF
```

## 4、部署etcd集群

### 4.1 创建etcd证书请求文件（在k8s-master01节点执行）

```shell
cat > etcd-csr.json <<EOF
{
    "CN": "etcd",
    "hosts": [
      "192.168.18.11",
      "192.168.18.12",
      "192.168.18.13",
      "192.168.18.14"
    ],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "BeiJing",
            "ST": "BeiJing"
        }
    ]
}
EOF

```

> 上述文件hosts字段中IP为所有etcd节点的集群内部通信IP，为了方便后期扩容可以多写几个预留的IP。当前是安装在节点服务器中，有条件的可以单独使用服务器进行安装

### 4.2 生成etcd证书文件（在k8s-master01节点执行）

```shell
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes etcd-csr.json | cfssljson -bare etcd
# 会生成etcd.pem和etcd-key.pem
# -profile就是ca-config.json中profile字段中的第一段
```

### 4.3 安装etcd二进制程序（在k8s-master01节点执行）

```shell
# 下载，官方地址：wget https://github.com/etcd-io/etcd/releases/download/v3.4.9/etcd-v3.4.9-linux-amd64.tar.gz
wget https://file.iamwx.cn/linux/etcd/etcd-v3.4.9-linux-amd64.tar.gz
# 解压
tar xf etcd-v3.4.9-linux-amd64.tar.gz

mkdir /opt/etcd/{bin,cfg,ssl} -p
mv etcd-v3.4.9-linux-amd64/{etcd,etcdctl} /opt/etcd/bin/
```

### 4.4 创建etcd配置文件（在k8s-master01节点执行）

```shell
cat > /opt/etcd/cfg/etcd.conf <<EOF
#[Member]
ETCD_NAME="etcd-1"
ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
ETCD_LISTEN_PEER_URLS="https://192.168.18.11:2380"
ETCD_LISTEN_CLIENT_URLS="https://192.168.18.11:2379"

#[Clustering]
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://192.168.18.11:2380"
ETCD_ADVERTISE_CLIENT_URLS="https://192.168.18.11:2379"
ETCD_INITIAL_CLUSTER="etcd-1=https://192.168.18.11:2380,etcd-2=https://192.168.18.12:2380,etcd-3=https://192.168.18.13:2380,etcd-4=https://192.168.18.14:2380,"
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"
ETCD_INITIAL_CLUSTER_STATE="new"
EOF
```

> 注:
> ETCD_NAME：节点名称，集群中唯一
> ETCD_DATA_DIR：数据目录
> ETCD_LISTEN_PEER_URLS：集群通信监听地址
> ETCD_LISTEN_CLIENT_URLS：客户端访问监听地址
> ETCD_INITIAL_ADVERTISE_PEERURLS：集群通告地址
> ETCD_ADVERTISE_CLIENT_URLS：客户端通告地址
> ETCD_INITIAL_CLUSTER：集群节点地址
> ETCD_INITIALCLUSTER_TOKEN：集群Token
> ETCD_INITIALCLUSTER_STATE：加入集群的当前状态，new是新集群，existing表示加入已有集群

### 4.5 复制所需的证书文件到etcd工作目录（在3中的master节点执行）

```shell
cp ~/TLS/etcd/ca*pem ~/TLS/etcd/etcd*pem /opt/etcd/ssl/
```

### 4.6 创建etcd启动服务文件（在k8s-master01节点执行）

```shell
cat > /usr/lib/systemd/system/etcd.service <<EOF
[Unit]
Description=Etcd Server
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
EnvironmentFile=/opt/etcd/cfg/etcd.conf
ExecStart=/opt/etcd/bin/etcd \
  --cert-file=/opt/etcd/ssl/etcd.pem \
  --key-file=/opt/etcd/ssl/etcd-key.pem \
  --trusted-ca-file=/opt/etcd/ssl/ca.pem \
  --peer-cert-file=/opt/etcd/ssl/etcd.pem \
  --peer-key-file=/opt/etcd/ssl/etcd-key.pem \
  --peer-trusted-ca-file=/opt/etcd/ssl/ca.pem \
  --logger=zap
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target

EOF
```

### 4.7 将当前节点的所有文件复制到其他etcd工作节点（在k8s-master01节点执行）

```shell
# 复制配置文件
scp -r /opt/etcd/ k8s-master-02:/opt/
scp -r /opt/etcd/ k8s-node-01:/opt/
scp -r /opt/etcd/ k8s-node-02:/opt/

# 复制服务文件
scp /usr/lib/systemd/system/etcd.service k8s-master-02:/usr/lib/systemd/system/etcd.service
scp /usr/lib/systemd/system/etcd.service k8s-node-01:/usr/lib/systemd/system/etcd.service
scp /usr/lib/systemd/system/etcd.service k8s-node-02:/usr/lib/systemd/system/etcd.service
```

### 4.8 修改其他etcd节点配置文件中的ip和名称（在k8s-master01节点执行）

```shell
# 修改配置文件中名称和IP地址
vi /opt/etcd/cfg/etcd.conf

ETCD_NAME="etcd-1" # 修改此处，节点2改为etcd-2，节点3改为etcd-3
ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
ETCD_LISTEN_PEER_URLS="https://192.168.18.11:2380" # 修改此处为当前服务器IP
ETCD_LISTEN_CLIENT_URLS="https://192.168.18.11:2379" # 修改此处为当前服务器IP

#[Clustering]
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://192.168.18.11:2380" # 修改此处为当前服务器IP
ETCD_ADVERTISE_CLIENT_URLS="https://192.168.18.11:2379" # 修改此处为当前服务器IP
ETCD_INITIAL_CLUSTER="etcd-1=https://192.168.18.11:2380,etcd-2=https://192.168.18.12:2380,etcd-3=https://192.168.18.13:2380,etcd-4=https://192.168.18.14:2380,"
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"
ETCD_INITIAL_CLUSTER_STATE="new"
```

### 4.9 所有节点启动etcd（所有服务器执行）

```shell
systemctl daemon-reload && systemctl enable etcd
systemctl start etcd
systemctl status etcd
# 在启动过程中会出现卡主的情况，继续启动其它节点，如果出现一直未启动成功，则执行 systemctl restart etcd 尝试重启
```

### 4.10 查看etcd运行状态（任一节点都可执行）

```shell
ETCDCTL_API=3
/opt/etcd/bin/etcdctl \
--cacert=/opt/etcd/ssl/ca.pem \
--cert=/opt/etcd/ssl/etcd.pem \
--key=/opt/etcd/ssl/etcd-key.pem \
--endpoints="https://192.168.18.11:2379,https://192.168.18.12:2379,https://192.168.18.13:2379,https://192.168.18.14:2379" endpoint health --write-out=table

# 实际打印
[root@k8s-master-01 ssl]# /opt/etcd/bin/etcdctl \
> --cacert=/opt/etcd/ssl/ca.pem \
> --cert=/opt/etcd/ssl/etcd.pem \
> --key=/opt/etcd/ssl/etcd-key.pem \
> --endpoints="https://192.168.18.11:2379,https://192.168.18.12:2379,https://192.168.18.13:2379,https://192.168.18.14:2379" endpoint health --write-out=table
+-----------------------------+--------+-------------+-------+
|          ENDPOINT           | HEALTH |    TOOK     | ERROR |
+-----------------------------+--------+-------------+-------+
| https://192.168.18.14:2379 |   true | 21.420113ms |       |
| https://192.168.18.12:2379 |   true | 22.194086ms |       |
| https://192.168.18.11:2379 |   true | 26.798433ms |       |
| https://192.168.18.13:2379 |   true | 25.402036ms |       |
+-----------------------------+--------+-------------+-------+
```

> 在部署过程中如有问题，可查看 tial -f /var/log/message 日志打印情况，针对性去解决

## 5、部署运行时docker（所有服务器执行）

### 5.1 下载二进制包

```shell
# wget https://download.docker.com/linux/static/stable/x86_64/docker-20.10.7.tgz
wget https://file.iamwx.cn/linux/docker/docker-20.10.7.tgz

tar zxvf docker-20.10.7.tgz
mv docker/* /usr/bin

# 确认二进制文件的所属主和组为root：root
chown -R root.root /usr/bin/
```

### 5.2 创建启动服务文件

```shell
cat > /usr/lib/systemd/system/docker.service << EOF
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TimeoutStartSec=0
Delegate=yes
KillMode=process
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target
EOF
```

### 5.3 创建配置文件

配置阿里云镜像加速器

```shell
mkdir /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "log-opts": {
    "max-size": "300m",
    "max-file": "2"
  },
  "registry-mirrors": ["https://jltw059v.mirror.aliyuncs.com"],
  "insecure-registries":["registry-dev.hzlinks.net"],
  "live-restore": true
}
EOF
```

### 5.4 启动并设置开机启动

```shell
systemctl daemon-reload
systemctl enable docker
systemctl start docker
systemctl status docker

# 验证启动是否成功
docker images
```

## 6、部署kube-apiserver（在k8s-master01节点执行）

### 6.1 生成kubernetes的CA证书

```shell
cd ~/TLS/k8s

cat > ca-config.json << EOF
{
  "signing": {
    "default": {
      "expiry": "876000h"
    },
    "profiles": {
      "kubernetes": {
         "expiry": "876000h",
         "usages": [
            "signing",
            "key encipherment",
            "server auth",
            "client auth"
        ]
      }
    }
  }
}
EOF

cat > ca-csr.json << EOF
{    
    "CA":{"expiry":"876000h"},
    "CN": "kubernetes-CA",
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "ShangHai",
            "ST": "ShangHai",
            "O": "k8s",
            "OU": "System"
        }
    ]
}
EOF

# 生成证书：会生成ca.pem和ca-key.pem文件
cfssl gencert -initca ca-csr.json | cfssljson -bare ca -
```

### 6.2 使用自签CA签发kube-apiserver证书

```shell
# 创建文件
cat > kube-apiserver-csr.json << \EOF
{
    "CN": "kubernetes",
    "hosts": [
      "10.0.0.1",
      "127.0.0.1",
      "192.168.18.10",
      "192.168.18.11",
      "192.168.18.12",
      "kubernetes",
      "kubernetes.default",
      "kubernetes.default.svc",
      "kubernetes.default.svc.cluster",
      "kubernetes.default.svc.cluster.local"
    ],
    "key": {
        "algo": "rsa",
        "size": 2048
    },
    "names": [
        {
            "C": "CN",
            "L": "BeiJing",
            "ST": "BeiJing",
            "O": "k8s",
            "OU": "System"
        }
    ]
}
EOF

# 生成证书
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-apiserver-csr.json | cfssljson -bare kube-apiserver
```

> 注：192.168.18.10为VIP（虚拟IP）11和12是master ip，为了方便后期扩容可以多写几个预留的IP。同时还需要填写 service 网络的首个IP。(一般是 kube-apiserver 指定的 service-cluster-ip-range 网段的第一个 IP，如 10.244.0.1)

### 6.3 下载二进制程序包

下载地址：[https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md)

```shell
# wget https://dl.k8s.io/v1.20.15/kubernetes-server-linux-amd64.tar.gz
wget https://file.iamwx.cn/linux/k8s/kubernetes-server-linux-amd64.tar.gz
 
# 创建k8s配置目录
mkdir -p /opt/kubernetes/{bin,cfg,ssl,logs}

# 解压
tar zxvf kubernetes-server-linux-amd64.tar.gz

# 将二进制文件放到配置目录
cd kubernetes/server/bin
cp kube-apiserver kube-scheduler kube-controller-manager kubelet kube-proxy /opt/kubernetes/bin
cp kubectl /usr/bin/
```

### 6.4 复制证书

```shell
cp ~/TLS/k8s/ca*pem ~/TLS/k8s/kube-apiserver*pem /opt/kubernetes/ssl/
```

### 6.5 创建配置文件

```shell
cat > /opt/kubernetes/cfg/kube-apiserver.conf << EOF
KUBE_APISERVER_OPTS="--logtostderr=false \\
--v=2 \\
--log-dir=/opt/kubernetes/logs \\
--etcd-servers=https://192.168.18.11:2379,https://192.168.18.12:2379,https://192.168.18.13:2379,https://192.168.18.14:2379 \\
--bind-address=192.168.18.11 \\
--secure-port=6443 \\
--advertise-address=192.168.18.11 \\
--allow-privileged=true \\
--service-cluster-ip-range=10.0.0.0/16 \\
--enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,ResourceQuota,NodeRestriction \\
--authorization-mode=RBAC,Node \\
--enable-bootstrap-token-auth=true \\
--token-auth-file=/opt/kubernetes/cfg/token.csv \\
--service-node-port-range=30000-32767 \\
--kubelet-client-certificate=/opt/kubernetes/ssl/kube-apiserver.pem \\
--kubelet-client-key=/opt/kubernetes/ssl/kube-apiserver-key.pem \\
--tls-cert-file=/opt/kubernetes/ssl/kube-apiserver.pem  \\
--tls-private-key-file=/opt/kubernetes/ssl/kube-apiserver-key.pem \\
--client-ca-file=/opt/kubernetes/ssl/ca.pem \\
--service-account-key-file=/opt/kubernetes/ssl/ca-key.pem \\
--service-account-issuer=https://kubernetes.default.svc.cluster.local \\
--service-account-signing-key-file=/opt/kubernetes/ssl/kube-apiserver-key.pem \\
--etcd-cafile=/opt/etcd/ssl/ca.pem \\
--etcd-certfile=/opt/etcd/ssl/etcd.pem \\
--etcd-keyfile=/opt/etcd/ssl/etcd-key.pem \\
--requestheader-client-ca-file=/opt/kubernetes/ssl/ca.pem \\
--proxy-client-cert-file=/opt/kubernetes/ssl/kube-apiserver.pem \\
--proxy-client-key-file=/opt/kubernetes/ssl/kube-apiserver-key.pem \\
--requestheader-allowed-names=kubernetes \\
--requestheader-extra-headers-prefix=X-Remote-Extra- \\
--requestheader-group-headers=X-Remote-Group \\
--requestheader-username-headers=X-Remote-User \\
--enable-aggregator-routing=true \\
--audit-log-maxage=30 \\
--audit-log-maxbackup=3 \\
--audit-log-maxsize=100 \\
--audit-log-path=/opt/kubernetes/logs/k8s-audit.log"
EOF
```

> 注：上面两个\\第一个是转义符，第二个是换行符，使用转义符是为了使用EOF保留换行符
> --logtostderr：启用日志
> ---v：日志等级
> --log-dir：日志目录
> --etcd-servers：etcd集群地址
> --bind-address：监听地址
> --secure-port：https安全端口
> --advertise-address：集群通告地址
> --allow-privileged：启用授权
> --service-cluster-ip-range：Service虚拟IP地址段
> --enable-admission-plugins：准入控制模块
> --authorization-mode：认证授权，启用RBAC授权和节点自管理
> --enable-bootstrap-token-auth：启用TLS bootstrap机制
> --token-auth-file：bootstrap token文件
> --service-node-port-range：Service nodeport类型默认分配端口范围
> --kubelet-client-xxx：apiserver访问kubelet客户端证书
> --tls-xxx-file：apiserver https证书
> 1.20版本必须加的参数：--service-account-issuer，--service-account-signing-key-file
> --etcd-xxxfile：连接Etcd集群证书
> --audit-log-xxx：审计日志
> 启动聚合层相关配置：--requestheader-client-ca-file，--proxy-client-cert-file，--proxy-client-key-file，--requestheader-allowed-names，--requestheader-extra-headers-prefix，--requestheader-group-headers，--requestheader-username-headers，--enable-aggregator-routing

### 6.6 TLS Bootstrapping 机制

创建token文件

```shell
cat > /opt/kubernetes/cfg/token.csv << EOF
458618e89e30412ba5aec9dbe5f580a6,kubelet-bootstrap,10001,"system:node-bootstrapper"
EOF
```

> 在上述的配置文件中kube-apiserver启用了Bootstrapping机制
>
> 格式：token，用户名，UID，用户组
>
> token也可自行生成替换

### 6.7 创建kube-apiserver启动托管文件

```shell
cat > /usr/lib/systemd/system/kube-apiserver.service << EOF
[Unit]
Description=Kubernetes API Server
Documentation=https://github.com/kubernetes/kubernetes

[Service]
EnvironmentFile=/opt/kubernetes/cfg/kube-apiserver.conf
ExecStart=/opt/kubernetes/bin/kube-apiserver \$KUBE_APISERVER_OPTS
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

### 6.8 启动kube-apiserver

```shell
systemctl daemon-reload
systemctl start kube-apiserver
systemctl enable kube-apiserver
systemctl status kube-apiserver
```

> 日志查看
>
> /var/log/message
>
> /opt/kubernetes/logs

## 7、部署kube-controller-manager（在k8s-master01节点执行）

### 7.1 创建配置文件

```shell
cat > /opt/kubernetes/cfg/kube-controller-manager.conf << EOF
KUBE_CONTROLLER_MANAGER_OPTS="--logtostderr=false \\
  --v=2 \\
  --log-dir=/opt/kubernetes/logs \\
  --leader-elect=true \\
  --kubeconfig=/opt/kubernetes/cfg/kube-controller-manager.kubeconfig \\
  --bind-address=127.0.0.1 \\
  --allocate-node-cidrs=true \\
  --cluster-cidr=10.244.0.0/16 \\
  --service-cluster-ip-range=10.0.0.0/16 \\
  --cluster-signing-cert-file=/opt/kubernetes/ssl/ca.pem \\
  --cluster-signing-key-file=/opt/kubernetes/ssl/ca-key.pem  \\
  --root-ca-file=/opt/kubernetes/ssl/ca.pem \\
  --service-account-private-key-file=/opt/kubernetes/ssl/ca-key.pem \\
  --cluster-signing-duration=876000h0m0s"
EOF
```

> --kubeconfig：连接apiserver配置文件
> --leader-elect：当该组件启动多个时，自动选举（HA）
> --cluster-signing-cert-file/--cluster-signing-key-file：自动为kubelet颁发证书的CA，与apiserver保持一致

### 7.2 创建证书请求文件

```shell
cd /root/TLS/k8s

cat > kube-controller-manager-csr.json << EOF
{
  "CN": "system:kube-controller-manager",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "L": "ShangHai", 
      "ST": "ShangHai",
      "O": "system:masters",
      "OU": "System"
    }
  ]
}
EOF
```

### 7.3 生成证书文件

```shell
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-controller-manager-csr.json | cfssljson -bare kube-controller-manager

# 拷贝证书
cp -r /root/TLS/k8s/kube-controller-manager*pem /opt/kubernetes/ssl
```

### 7.4 生成kubeconfig文件

以下内容整体复制一起执行

```shell
KUBE_CONFIG="/opt/kubernetes/cfg/kube-controller-manager.kubeconfig"
KUBE_APISERVER="https://192.168.18.11:6443"
# 设置集群信息
kubectl config set-cluster kubernetes \
  --certificate-authority=/opt/kubernetes/ssl/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=${KUBE_CONFIG}
# 设置用户认证信息
kubectl config set-credentials kube-controller-manager \
  --client-certificate=/opt/kubernetes/ssl/kube-controller-manager.pem \
  --client-key=/opt/kubernetes/ssl/kube-controller-manager-key.pem \
  --embed-certs=true \
  --kubeconfig=${KUBE_CONFIG}
# 设置上下文
kubectl config set-context default \
  --cluster=kubernetes \
  --user=kube-controller-manager \
  --kubeconfig=${KUBE_CONFIG}
# 设置当前上下文
kubectl config use-context default --kubeconfig=${KUBE_CONFIG}

# 查看配置
cat /opt/kubernetes/cfg/kube-controller-manager.kubeconfig
```

### 7.5 创建启动托管文件

```shell
cat > /usr/lib/systemd/system/kube-controller-manager.service << EOF
[Unit]
Description=Kubernetes Controller Manager
Documentation=https://github.com/kubernetes/kubernetes

[Service]
EnvironmentFile=/opt/kubernetes/cfg/kube-controller-manager.conf
ExecStart=/opt/kubernetes/bin/kube-controller-manager \$KUBE_CONTROLLER_MANAGER_OPTS
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

### 7.6 启动kube-controller-manager

```shell
systemctl daemon-reload
systemctl start kube-controller-manager
systemctl enable kube-controller-manager
systemctl status kube-controller-manager
```

## 8、部署kube-scheduler（在k8s-master01节点执行）

### 8.1 创建配置文件

```shell
cat > /opt/kubernetes/cfg/kube-scheduler.conf << EOF
KUBE_SCHEDULER_OPTS="--logtostderr=false \\
--v=2 \\
--log-dir=/opt/kubernetes/logs \\
--leader-elect \\
--kubeconfig=/opt/kubernetes/cfg/kube-scheduler.kubeconfig \\
--bind-address=127.0.0.1"
EOF
```

### 8.2 创建证书请求文件

```shell
cd /root/TLS/k8s/

cat > kube-scheduler-csr.json << EOF
{
  "CN": "system:kube-scheduler",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "L": "ShangHai",
      "ST": "ShangHai",
      "O": "system:masters",
      "OU": "System"
    }
  ]
}
EOF
```

### 8.3 生成证书

```shell
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-scheduler-csr.json | cfssljson -bare kube-scheduler

# 拷贝证书
cp kube-scheduler*.pem /opt/kubernetes/ssl
```

### 8.4 生成kubeconfig文件

整体复制执行

```shell
KUBE_CONFIG="/opt/kubernetes/cfg/kube-scheduler.kubeconfig"
KUBE_APISERVER="https://192.168.18.11:6443"

kubectl config set-cluster kubernetes \
  --certificate-authority=/opt/kubernetes/ssl/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=${KUBE_CONFIG}
kubectl config set-credentials kube-scheduler \
  --client-certificate=/opt/kubernetes/ssl/kube-scheduler.pem \
  --client-key=/opt/kubernetes/ssl/kube-scheduler-key.pem \
  --embed-certs=true \
  --kubeconfig=${KUBE_CONFIG}
kubectl config set-context default \
  --cluster=kubernetes \
  --user=kube-scheduler \
  --kubeconfig=${KUBE_CONFIG}
kubectl config use-context default --kubeconfig=${KUBE_CONFIG}
```

### 8.5 创建启动托管文件

```shell
cat > /usr/lib/systemd/system/kube-scheduler.service << EOF
[Unit]
Description=Kubernetes Scheduler
Documentation=https://github.com/kubernetes/kubernetes

[Service]
EnvironmentFile=/opt/kubernetes/cfg/kube-scheduler.conf
ExecStart=/opt/kubernetes/bin/kube-scheduler \$KUBE_SCHEDULER_OPTS
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

### 8.6 启动并设置开机自启

```shell
systemctl daemon-reload
systemctl start kube-scheduler
systemctl enable kube-scheduler
systemctl status kube-scheduler
```

## 9、配置kubectl（在k8s-master01节点执行）

### 9.1 创建证书请求文件

```shell
cd ~/TLS/k8s

cat > admin-csr.json << EOF
{
  "CN": "admin",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "L": "BeiJing",
      "ST": "BeiJing",
      "O": "system:masters",
      "OU": "System"
    }
  ]
}
EOF
```

### 9.2 生成证书

```shell
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes admin-csr.json | cfssljson -bare admin

# 拷贝证书
cp admin*.pem /opt/kubernetes/ssl
```

### 9.3 创建kubeconfig文件

```shell
mkdir /root/.kube

# 下面内容一次性复制执行
KUBE_CONFIG="/root/.kube/config"
KUBE_APISERVER="https://192.168.18.11:6443"

kubectl config set-cluster kubernetes \
  --certificate-authority=/opt/kubernetes/ssl/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=${KUBE_CONFIG}
kubectl config set-credentials cluster-admin \
  --client-certificate=/opt/kubernetes/ssl/admin.pem \
  --client-key=/opt/kubernetes/ssl/admin-key.pem \
  --embed-certs=true \
  --kubeconfig=${KUBE_CONFIG}
kubectl config set-context default \
  --cluster=kubernetes \
  --user=cluster-admin \
  --kubeconfig=${KUBE_CONFIG}
kubectl config use-context default --kubeconfig=${KUBE_CONFIG}
```

### 9.4 查看集群状态

```shell
# 使用kubectl查看集群状态
[root@k8s-master-01 .kube]# kubectl get cs
Warning: v1 ComponentStatus is deprecated in v1.19+
NAME                 STATUS    MESSAGE             ERROR
scheduler            Healthy   ok
controller-manager   Healthy   ok       
etcd-0               Healthy   {"health":"true"}   
etcd-1               Healthy   {"health":"true"}   
etcd-2               Healthy   {"health":"true"}  
etcd-3               Healthy   {"health":"true"}

#创建node必备，不然node的kubelet无法启动,就是创建一个可以申请证书的用户
kubectl create clusterrolebinding kubelet-bootstrap \
--clusterrole=system:node-bootstrapper \
--user=kubelet-bootstrap
```

## 10、部署kubelet

### 10.1 创建工作目录（k8s-node-01和k8s-node-02执行）

```shell
mkdir -p /opt/kubernetes/{bin,cfg,ssl,logs} 
mkdir -p /root/.kube
```

> 如果节点数很多，可使用for循环方式执行
>
> for i in {14..15};do ssh 192.168.18.$ 'mkdir -p /opt/kubernetes/{bin,cfg,ssl,logs}'; done

### 10.2 拷贝二进制和证书文件（k8s-master-01执行）

```shell
# 拷贝二进制文件
cd /root/TLS/k8s/kubernetes/server/bin
for i in {13..14};do scp kubelet kube-proxy 192.168.18.$i:/opt/kubernetes/bin;done
for i in {13..14};do scp /usr/bin/kubectl 192.168.18.$i:/usr/bin;done

# 拷贝证书文件
for i in {13..14};do scp /opt/kubernetes/ssl/ca.pem 192.168.18.$i:/opt/kubernetes/ssl;done

# 拷贝配置文件
for i in {13..14};do scp /root/.kube/config 192.168.18.$i:/root/.kube/config;done

# 前往k8s-node-01和k8s-node-02对应目录下查看二进制文件是否复制过去
[root@k8s-node-02 cfg]# cd /opt/kubernetes/bin/
[root@k8s-node-02 bin]# ll
总用量 150076
-rwxr-xr-x. 1 root root 114187464 8月  11 11:16 kubelet
-rwxr-xr-x. 1 root root  39489536 8月  11 11:16 kube-proxy

[root@k8s-node-02 cfg]# cd /opt/kubernetes/ssl
[root@k8s-node-02 ssl]# ll
总用量 4
-rw-r--r--. 1 root root 1375 8月  11 11:21 ca.pem
```

### 10.3 创建配置文件（k8s-node-01和k8s-node-02执行）

> 不同节点执行时需要把 hostname-override 修改为当前节点名称

```shell
cat > /opt/kubernetes/cfg/kubelet.conf << EOF
KUBELET_OPTS="--logtostderr=false \\
--v=2 \\
--log-dir=/opt/kubernetes/logs \\
--hostname-override=k8s-node-01 \\
--network-plugin=cni \\
--kubeconfig=/opt/kubernetes/cfg/kubelet.kubeconfig \\
--bootstrap-kubeconfig=/opt/kubernetes/cfg/bootstrap.kubeconfig \\
--config=/opt/kubernetes/cfg/kubelet-config.yml \\
--cert-dir=/opt/kubernetes/ssl \\
--pod-infra-container-image=liuyanzhen/pause-amd64:3.0"
EOF
```

### 10.4 创建参数配置文件（k8s-node-01和k8s-node-02执行）

```shell
cat > /opt/kubernetes/cfg/kubelet-config.yml << EOF
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
address: 0.0.0.0
port: 10250
readOnlyPort: 10255
cgroupDriver: cgroupfs
clusterDNS:
- 10.0.0.2
clusterDomain: cluster.local 
failSwapOn: false
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 2m0s
    enabled: true
  x509:
    clientCAFile: /opt/kubernetes/ssl/ca.pem 
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 5m0s
    cacheUnauthorizedTTL: 30s
evictionHard:
  imagefs.available: 15%
  memory.available: 100Mi
  nodefs.available: 10%
  nodefs.inodesFree: 5%
maxOpenFiles: 1000000
maxPods: 110
EOF
```

### 10.5 生成kubelet初次加入集群引导kubeconfig文件（k8s-node-01和k8s-node-02执行）

```shell
## 一下内容一次性复制执行
KUBE_CONFIG="/opt/kubernetes/cfg/bootstrap.kubeconfig"
KUBE_APISERVER="https://192.168.18.11:6443"
TOKEN="458618e89e30412ba5aec9dbe5f580a6" # 与token.csv里保持一致

# 生成 kubelet bootstrap kubeconfig 配置文件
kubectl config set-cluster kubernetes \
  --certificate-authority=/opt/kubernetes/ssl/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=${KUBE_CONFIG}
kubectl config set-credentials "kubelet-bootstrap" \
  --token=${TOKEN} \
  --kubeconfig=${KUBE_CONFIG}
kubectl config set-context default \
  --cluster=kubernetes \
  --user="kubelet-bootstrap" \
  --kubeconfig=${KUBE_CONFIG}
kubectl config use-context default --kubeconfig=${KUBE_CONFIG}
```

### 10.6 创建启动托管文件（k8s-node-01和k8s-node-02执行）

```shell
cat > /usr/lib/systemd/system/kubelet.service << EOF
[Unit]
Description=Kubernetes Kubelet
After=docker.service

[Service]
EnvironmentFile=/opt/kubernetes/cfg/kubelet.conf
ExecStart=/opt/kubernetes/bin/kubelet \$KUBELET_OPTS
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

> \$KUBELET_OPTS  前面加个"\\"转义，不加的话，他取变量KUBELET_OPTS 的值，为空

### 10.7 启动并设置开机自启（k8s-node-01和k8s-node-02执行）

```shell
systemctl daemon-reload
systemctl start kubelet
systemctl enable kubelet
systemctl status kubelet
```

### 10.8 批准kubelet证书申请并加入集群（在k8s-node-01执行）

```shell
# 查看当前证书申请列表
[root@k8s-node-02 cfg]# kubectl get csr
NAME                                                   AGE     SIGNERNAME                                    REQUESTOR           CONDITION
node-csr-Lsz_4FLMZwjmGX6kd2zotIsdMC_c8rIyOdHWdIC0yD0   7m13s   kubernetes.io/kube-apiserver-client-kubelet   kubelet-bootstrap   Pending
node-csr-Oz1Q0HzqDz_a7F6ixhjhdW4IC-0cSR3DFPt197BVNYc   9s      kubernetes.io/kube-apiserver-client-kubelet   kubelet-bootstrap   Pending

# 批转申请
[root@k8s-node-02 cfg]# kubectl certificate approve node-csr-Lsz_4FLMZwjmGX6kd2zotIsdMC_c8rIyOdHWdIC0yD0
certificatesigningrequest.certificates.k8s.io/node-csr-Lsz_4FLMZwjmGX6kd2zotIsdMC_c8rIyOdHWdIC0yD0 approved
[root@k8s-node-02 cfg]# kubectl certificate approve node-csr-Oz1Q0HzqDz_a7F6ixhjhdW4IC-0cSR3DFPt197BVNYc
certificatesigningrequest.certificates.k8s.io/node-csr-Oz1Q0HzqDz_a7F6ixhjhdW4IC-0cSR3DFPt197BVNYc approved

# 批转后从 Pending 变为 Approved,Issued
[root@k8s-node-02 cfg]# kubectl get csr
NAME                                                   AGE     SIGNERNAME                                    REQUESTOR           CONDITION
node-csr-Lsz_4FLMZwjmGX6kd2zotIsdMC_c8rIyOdHWdIC0yD0   8m52s   kubernetes.io/kube-apiserver-client-kubelet   kubelet-bootstrap   Approved,Issued
node-csr-Oz1Q0HzqDz_a7F6ixhjhdW4IC-0cSR3DFPt197BVNYc   108s    kubernetes.io/kube-apiserver-client-kubelet   kubelet-bootstrap   Approved,Issued  

# 查看当前节点列表，这个时候节点状态肯定是NotReady，安装Calico之后就会好
[root@k8s-node-02 cfg]# kubectl get node
NAME          STATUS     ROLES    AGE   VERSION
k8s-node-01   NotReady   <none>   42s   v1.20.15
k8s-node-02   NotReady   <none>   25s   v1.20.15
```

## 11、将master节点也加入集群中去

> 这样master节点也可以作为一个工作节点使用

### 11.1 k8s-master-02部署apiserver,controller manager,scheduler

* 初始化工作目录（在k8s-master-02上执行）

```shell
mkdir -p /opt/kubernetes/{bin,cfg,ssl,logs}
```

* 从k8s-master-01节点复制配置文件到k8s-master-02（在k8s-master-01上执行）

```shell
scp /opt/kubernetes/cfg/{kube-apiserver.conf,kube-controller-manager.conf,kube-controller-manager.kubeconfig,kube-scheduler.conf,kube-scheduler.kubeconfig,token.csv} k8s-master-02:/opt/kubernetes/cfg/
```

* 从k8s-master-01节点复制二进制文件到k8s-master-02（在k8s-master-01上执行）

```shell
scp /opt/kubernetes/bin/{kube-apiserver,kube-controller-manager,kube-scheduler,kubelet,kube-proxy} k8s-master-02:/opt/kubernetes/bin/

scp /usr/bin/kubectl k8s-master-02:/usr/bin/
```

* 从k8s-master-01节点证书到k8s-master-02（在k8s-master-01上执行）

```shell
scp /opt/kubernetes/ssl/{kube-apiserver.pem,kube-apiserver-key.pem,ca.pem,ca-key.pem,kube-controller-manager.pem,kube-controller-manager-key.pem,kube-scheduler.pem,kube-scheduler-key.pem} k8s-master-02:/opt/kubernetes/ssl/
```

* 从k8s-master-01节点启动托管文件到k8s-master-02（在k8s-master-01上执行）

```shell
scp /usr/lib/systemd/system/{kube-apiserver.service,kube-controller-manager.service,kube-scheduler.service} k8s-master-02:/usr/lib/systemd/system/
```

* 修改k8s-master-02上的apiserver配置文件（在k8s-master-02上执行）

```shell
vi /opt/kubernetes/cfg/kube-apiserver.conf

# 将以下两个参数值修改为当前机器IP地址
--bind-address=192.168.18.12
--advertise-address=192.168.18.12
```

* 从k8s-master-01复制kubectl配置文件到k8s-master-02（在k8s-master-01上执行）

```shell
scp /root/.kube/config k8s-master-02:/root/.kube/
```

* 启动并设置开机自启（在k8s-master-01上执行）

```shell
systemctl daemon-reload
systemctl start kube-apiserver kube-controller-manager kube-scheduler
systemctl enable kube-apiserver kube-controller-manager kube-scheduler
systemctl status kube-apiserver kube-controller-manager kube-scheduler
```

### 11.2 在两个master节点安装kubelet

* 从k8s-node-01拷贝配置文件（在k8s-master-01上执行）

```shell
scp k8s-node-01:/opt/kubernetes/cfg/{bootstrap.kubeconfig,kubelet.conf,kubelet-config.yml} /opt/kubernetes/cfg/

scp /opt/kubernetes/cfg/{bootstrap.kubeconfig,kubelet.conf,kubelet-config.yml} k8s-master-02:/opt/kubernetes/cfg/
```

* 修改配置文件kubelet.conf（在k8s-master-01和k8s-master-02上执行）

```shell
vi /opt/kubernetes/cfg/kubelet.conf
# 修改下发属性值为当前节点主机名
--hostname-override=k8s-master-01
```

* 从k8s-node-01拷贝二进制文件（在k8s-master-01上执行）

```shell
scp k8s-node-01:/usr/lib/systemd/system/kubelet.service /usr/lib/systemd/system/

scp /usr/lib/systemd/system/kubelet.service k8s-master-02:/usr/lib/systemd/system/
```

* 启动并设置开机自启（在k8s-master-01和k8s-master-02上执行）

```shell
systemctl daemon-reload
systemctl start kubelet
systemctl enable kubelet
systemctl status kubelet
```

* 同意证书签发请求（在k8s-master-01执行）

```shell
# 查看当前证书请求
[root@k8s-master-01 cfg]# kubectl get csr
NAME                                                   AGE   SIGNERNAME                                    REQUESTOR           CONDITION
node-csr--aP_LROZHTdnIStYlf6WBw6DS4U0Uics2r1Hya-hN9Y   12s   kubernetes.io/kube-apiserver-client-kubelet   kubelet-bootstrap   Pending
# 同意认证
[root@k8s-master-01 cfg]# kubectl certificate approve node-csr--aP_LROZHTdnIStYlf6WBw6DS4U0Uics2r1Hya-hN9Y
certificatesigningrequest.certificates.k8s.io/node-csr--aP_LROZHTdnIStYlf6WBw6DS4U0Uics2r1Hya-hN9Y approved

[root@k8s-master-01 cfg]# kubectl get csr
NAME                                                   AGE   SIGNERNAME                                    REQUESTOR           CONDITION
node-csr--aP_LROZHTdnIStYlf6WBw6DS4U0Uics2r1Hya-hN9Y   47s   kubernetes.io/kube-apiserver-client-kubelet   kubelet-bootstrap   Approved,Issued
# 查看当前节点列表
[root@k8s-master-01 cfg]# kubectl get node
NAME            STATUS     ROLES    AGE     VERSION
k8s-master-01   NotReady   <none>   59m     v1.20.15
k8s-master-02   NotReady   <none>   9s      v1.20.15
k8s-node-01     NotReady   <none>   7h31m   v1.20.15
k8s-node-02     NotReady   <none>   7h30m   v1.20.15
```

## 12、部署kube-proxy（k8s-master-01上执行）

### 12.1 创建配置文件

```shell
cat > /opt/kubernetes/cfg/kube-proxy.conf << EOF
KUBE_PROXY_OPTS="--logtostderr=false \\
--v=2 \\
--log-dir=/opt/kubernetes/logs \\
--config=/opt/kubernetes/cfg/kube-proxy-config.yml"
EOF
```

### 12.2 创建配置参数文件

```shell
cat > /opt/kubernetes/cfg/kube-proxy-config.yml << EOF
kind: KubeProxyConfiguration
apiVersion: kubeproxy.config.k8s.io/v1alpha1
bindAddress: 0.0.0.0
metricsBindAddress: 0.0.0.0:10249
clientConnection:
  kubeconfig: /opt/kubernetes/cfg/kube-proxy.kubeconfig
hostnameOverride: k8s-master-01
clusterCIDR: 10.0.0.0/16
EOF
```

### 12.3 生成证书

```shell
# 切换工作目录
cd /root/TLS/k8s

# 创建证书请求文件
cat > kube-proxy-csr.json << EOF
{
  "CN": "system:kube-proxy",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "L": "ShangHai",
      "ST": "ShangHai",
      "O": "k8s",
      "OU": "System"
    }
  ]
}
EOF

# 生成证书
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=kubernetes kube-proxy-csr.json | cfssljson -bare kube-proxy

# 拷贝证书
cp kube-proxy*.pem /opt/kubernetes/ssl/
```

### 12.4 生成kube-proxy.kubeconfig文件

```shell
KUBE_CONFIG="/opt/kubernetes/cfg/kube-proxy.kubeconfig"
KUBE_APISERVER="https://192.168.18.11:6443"

kubectl config set-cluster kubernetes \
  --certificate-authority=/opt/kubernetes/ssl/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=${KUBE_CONFIG}
kubectl config set-credentials kube-proxy \
  --client-certificate=/opt/kubernetes/ssl/kube-proxy.pem \
  --client-key=/opt/kubernetes/ssl/kube-proxy-key.pem \
  --embed-certs=true \
  --kubeconfig=${KUBE_CONFIG}
kubectl config set-context default \
  --cluster=kubernetes \
  --user=kube-proxy \
  --kubeconfig=${KUBE_CONFIG}
kubectl config use-context default --kubeconfig=${KUBE_CONFIG}
```

### 12.5 创建启动托管文件

```shell
cat > /usr/lib/systemd/system/kube-proxy.service << EOF
[Unit]
Description=Kubernetes Proxy
After=network.target

[Service]
EnvironmentFile=/opt/kubernetes/cfg/kube-proxy.conf
ExecStart=/opt/kubernetes/bin/kube-proxy \$KUBE_PROXY_OPTS
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

### 12.6 启动并设置开机自启

```shell
systemctl daemon-reload
systemctl start kube-proxy
systemctl enable kube-proxy
systemctl status kube-proxy
```

> 启动后会有报错，只有在calico插件安装完成后才会正常

![image-20220811222633939](https://file.iamwx.cn/images/202208112226112.png)

### 12.7 其它节点安装并启动kube-proxy

```shell
# 拷贝证书
for i in {12..14};do scp /opt/kubernetes/ssl/kube-proxy*pem 192.168.18.$i:/opt/kubernetes/ssl/;done

# 拷贝配置文件
for i in {12..14};do scp /opt/kubernetes/cfg/{kube-proxy.conf,kube-proxy-config.yml,kube-proxy.kubeconfig} 192.168.18.$i:/opt/kubernetes/cfg/;done

# 其它节点需要修改
vi /opt/kubernetes/cfg/kube-proxy-config.yml
# 修改 kube-proxy-config.yml 中 hostnameOverride 值为当前主机名
hostnameOverride: k8s-master-02

# 拷贝服务文件
for i in {12..14};do scp /usr/lib/systemd/system/kube-proxy.service 192.168.18.$i:/usr/lib/systemd/system/;done

# 启动并设置开机自启
systemctl daemon-reload
systemctl start kube-proxy
systemctl enable kube-proxy
systemctl status kube-proxy
```

问题： Failed to retrieve node info: nodes "k8s-master-02" is forbidden: User "system:anonymous" cannot get resource "nodes" in API group "" at the cluster scope

```shell
# 给匿名用户授予集群管理权限，在【k8s-master-01节点】上执行
kubectl create clusterrolebinding anonymous-cluster-admin --clusterrole=cluster-admin --user=system:anonymous

# anonymous-cluster-admin是角色绑定名称，随意取名，然后重启kube-proxy
systemctl restart kube-proxy
systemctl status kube-proxy
```

## 13、部署网络插件calico（k8s-master-01执行）

### 13.1 授权apiserver访问kubelet

>  kubectl logs -f POD_NAME -n kube-system 会报错 Forbidden

```shell
cat > apiserver-to-kubelet-rbac.yaml << EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
  labels:
    kubernetes.io/bootstrapping: rbac-defaults
  name: system:kube-apiserver-to-kubelet
rules:
  - apiGroups:
      - ""
    resources:
      - nodes/proxy
      - nodes/stats
      - nodes/log
      - nodes/spec
      - nodes/metrics
      - pods/log
    verbs:
      - "*"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-apiserver
  namespace: ""
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-apiserver-to-kubelet
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: kubernetes
EOF

# 执行后，再通过 kubectl logs -f POD_NAME -n kube-system 则会正常
kubectl apply -f apiserver-to-kubelet-rbac.yaml
```

报错截图

![image-20220815134801912](https://file.iamwx.cn/images/202208151348061.png)

### 13.2 下载并apply

```shell
# 下载calico.yaml文件到本地，我自己下载留存了一份 curl https://file.iamwx.cn/linux/k8s/calico.yaml -O
curl https://projectcalico.docs.tigera.io/archive/v3.22/manifests/calico.yaml -O

# 用编辑器打开后取消CALICO_IPV4POOL_CIDR和value的注释，并设置值为--cluster-cidr的值，修改完后上传到CoreDNS
- name: CALICO_IPV4POOL_CIDR
value: "10.244.0.0/16"

# 先手动把需要的镜像pull下来，如果直接执行下一步，会因为拉取镜像超时报 Back-off pulling image 错误
docker pull docker.io/calico/kube-controllers:v3.22.4
docker pull docker.io/calico/cni:v3.22.4
docker pull docker.io/calico/pod2daemon-flexvol:v3.22.4
docker pull docker.io/calico/node:v3.22.4

### 上面的拉取较慢，我上传到了阿里云镜像，如果使用阿里云的，需要把calico.yaml文件中对应镜像修改掉
docker pull registry.cn-hangzhou.aliyuncs.com/wxstudyk8s/calico_kube-controllers:v3.22.4
docker pull registry.cn-hangzhou.aliyuncs.com/wxstudyk8s/calico_cni:v3.22.4
docker pull registry.cn-hangzhou.aliyuncs.com/wxstudyk8s/calico_pod2daemon-flexvol:v3.22.4
docker pull registry.cn-hangzhou.aliyuncs.com/wxstudyk8s/calico_node:v3.22.4

# 执行apply
[root@k8s-master-01 ~]# kubectl apply -f calico.yaml 
configmap/calico-config created
customresourcedefinition.apiextensions.k8s.io/bgpconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/bgppeers.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/blockaffinities.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/caliconodestatuses.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/clusterinformations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/felixconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/globalnetworkpolicies.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/globalnetworksets.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/hostendpoints.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamblocks.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamconfigs.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamhandles.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ippools.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipreservations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/kubecontrollersconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/networkpolicies.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/networksets.crd.projectcalico.org created
clusterrole.rbac.authorization.k8s.io/calico-kube-controllers created
clusterrolebinding.rbac.authorization.k8s.io/calico-kube-controllers created
clusterrole.rbac.authorization.k8s.io/calico-node created
clusterrolebinding.rbac.authorization.k8s.io/calico-node created
daemonset.apps/calico-node created
serviceaccount/calico-node created
deployment.apps/calico-kube-controllers created
serviceaccount/calico-kube-controllers created
poddisruptionbudget.policy/calico-kube-controllers created
```

### 13.3 查看calico运行状态

```shell
# 一开始READY都是 0/1，需要等待5分钟左右
[root@k8s-master-01 ~]# kubectl get pod -A
NAMESPACE     NAME                                      READY   STATUS              RESTARTS   AGE
kube-system   calico-kube-controllers-59445c789-vm7t8   0/1     ContainerCreating   0          48s
kube-system   calico-node-4ncpf                         0/1     Init:0/4            0          49s
kube-system   calico-node-fd2dq                         0/1     Init:0/4            0          49s
kube-system   calico-node-h2wjc                         0/1     Init:0/4            0          48s
kube-system   calico-node-vdxfz                         0/1     Init:2/4            0          49s
# 查看接口，STATUS都变为Ready了
[root@k8s-master-01 ~]# kubectl get node
NAME            STATUS   ROLES    AGE     VERSION
k8s-master-01   Ready    <none>   3d16h   v1.20.15
k8s-master-02   Ready    <none>   3d15h   v1.20.15
k8s-node-01     Ready    <none>   3d23h   v1.20.15
k8s-node-02     Ready    <none>   3d23h   v1.20.15
# 查看所有Pod的STATUS都是Running
[root@k8s-master-01 ~]# kubectl get pod -n kube-system
NAME                                      READY   STATUS    RESTARTS   AGE
calico-kube-controllers-59445c789-xgkcf   1/1     Running   1          3m54s
calico-node-4rlbk                         1/1     Running   0          3m55s
calico-node-6t57d                         1/1     Running   0          3m55s
calico-node-djb5n                         1/1     Running   0          3m55s
calico-node-lg8dp                         1/1     Running   0          3m55s
```

## 14、 部署CoreDNS（k8s-master-01执行）

> 官方文档：https://coredns.io/   https://github.com/coredns/coredns

### 14.1 下载并apply

```shell
# 下载coredns-1.8.yaml文件到本地，原：wget https://storage.googleapis.com/kubernetes-the-hard-way/coredns-1.8.yaml
wget https://file.iamwx.cn/linux/k8s/coredns.yaml

# 修改 clusterIP 值为自己的 cluster-ip 段内，然后上传到服务器
clusterIP: 10.0.0.2

# 执行yaml文件
[root@k8s-master-01 ~]# kubectl apply -f coredns-1.8.yaml 
serviceaccount/coredns created
clusterrole.rbac.authorization.k8s.io/system:coredns created
clusterrolebinding.rbac.authorization.k8s.io/system:coredns created
configmap/coredns created
deployment.apps/coredns created
service/kube-dns created
```

### 14.2 查看运行状态

```shell
[root@k8s-master-01 ~]# kubectl get pods -l k8s-app=kube-dns -n kube-system
NAME                       READY   STATUS    RESTARTS   AGE
coredns-76f5d77d78-cs8gk   1/1     Running   0          2m8s
coredns-76f5d77d78-t7ccx   1/1     Running   0          2m9s
```

### 14.3 验证CoreDNS

```shell
[root@k8s-master-01 deploy]# kubectl run -it --rm dns-test --image=busybox:1.28.4 sh 
If you don't see a command prompt, try pressing enter.
/ # nslookup kubernetes
Server:    10.0.0.2
Address 1: 10.0.0.2 kube-dns.kube-system.svc.cluster.local

Name:      kubernetes
Address 1: 10.0.0.1 kubernetes.default.svc.cluster.local
/ # nslookup www.baidu.com
Server:    10.0.0.2
Address 1: 10.0.0.2 kube-dns.kube-system.svc.cluster.local

Name:      www.baidu.com
Address 1: 36.152.44.96
Address 2: 36.152.44.95
```

## 15、实现高可用

### 15.1 方案选型

方案一：haproxy + keepalived

方案二：nginx + keepalived

方案一在haproxy里面可增加对后端服务的动态检测功能，方案二中nginx没有对后端的服务做健康监测，故选择方案一来实现

### 15.2 安装haproxy（k8s-master-01和k8s-master-02执行）

* 安装haproxy

```shell
yum install haproxy
```

* 修改配置文件

> 修改 backend kube-apiserver 中IP地址为自己的

```shell
cd /etc/haproxy
# 备份原文件
mv haproxy.cfg haproxy.cfg.bak

# 创建新文件
cat > haproxy.cfg << EOF
global
    log         127.0.0.1 local2
    chroot      /var/lib/haproxy
    pidfile     /var/run/haproxy.pid
    maxconn     4000
    user        haproxy
    group       haproxy
    daemon
    stats socket /var/lib/haproxy/stats

defaults
    mode                    http
    log                     global
    option                  httplog
    option                  dontlognull
    option http-server-close
    option forwardfor       except 127.0.0.0/8
    option                  redispatch
    retries                 3
    timeout http-request    10s
    timeout queue           1m
    timeout connect         10s
    timeout client          1m
    timeout server          1m
    timeout http-keep-alive 10s
    timeout check           10s
    maxconn                 3000

frontend  kube-apiserver
    mode                 tcp
    bind                 *:8443
    option               tcplog
    default_backend      kube-apiserver

listen stats
    mode                 http
    bind                 *:1080
    stats auth           admin:abc2271660669
    stats refresh        5s
    stats realm          HAProxy\ Statistics
    stats uri            /stats

backend kube-apiserver
    mode        tcp
    balance     roundrobin
    server  k8s-matser1 192.168.18.11:6443 check
    server  k8s-matser2 192.168.18.12:6443 check
EOF
```

* 启动并设置开机自启

```shell
systemctl daemon-reload
systemctl start haproxy
systemctl enable haproxy
systemctl status haproxy
```

### 15.3 安装keepalived（k8s-master-01和k8s-master-02执行）

* 安装

```shell
yum install keepalived
```

* 修改配置文件

```shell
cd /etc/keepalived
# 备份配置文件
mv keepalived.conf keepalived.conf.bak
```

创建配置文件 --> k8s-master-01

> interface 需要修改为当前机器的网卡名称: ens33 修改为自己当前的网卡名称
>
> router_id 在k8s-master-01 上为 LVS_1，k8s-master-02 上为 LVS_2
>
> virtual_ipaddress 设置为自己准备的虚拟IP，不可被占用

```shell
cat > keepalived.conf << EOF
! Configuration File for keepalived

global_defs {
   router_id LVS_1
}

vrrp_script checkhaproxy
{
    script "/opt/check.sh"
    interval 1
    weight -30

}

vrrp_instance VI_1 {
    state MASTER
    interface ens33
    virtual_router_id 100
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass XFGzfOVZq15lj2r7
    }
    virtual_ipaddress {
        192.168.18.10/24
    }
    track_script
    {
        checkhaproxy
    }
}
EOF
```

创建配置文件 --> k8s-master-02

```shell
cat > keepalived.conf << EOF
! Configuration File for keepalived

global_defs {
   router_id LVS_2
}

vrrp_script checkhaproxy
{
    script "/opt/check.sh"
    interval 1
    weight -30

}

vrrp_instance VI_1 {
    state BACKUP
    interface ens33
    virtual_router_id 100
    priority 90
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass XFGzfOVZq15lj2r7
    }
    virtual_ipaddress {
        192.168.18.10/24
    }
    track_script
    {
        checkhaproxy
    }
}
EOF
```

* 准备check.sh文件

> 使用vi然后粘贴，如果使用 cat > << EOF 会自动替换值

```shell
cd /opt
vi check.sh

#!/bin/bash
count=`netstat -apn | grep 0.0.0.0:8443 | wc -l`
if [ $count -gt 0 ]; then
    exit 0
else
    exit 1
fi

# 赋予检测脚本check.sh可执行权限 
chmod +x /opt/check.sh
```

* 启动并设置开机自启

```shell
systemctl daemon-reload
systemctl start keepalived
systemctl enable keepalived
systemctl status keepalived
```

* 查看当前的VIP所在机器

```shell
# 在k8s-master-01执行
[root@k8s-master-01 keepalived]# ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.18.11/24 brd 192.168.18.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
    # 可见VIP的IP在当前机器
    inet 192.168.18.10/24 scope global secondary ens33
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
4: tunl0@NONE: <NOARP,UP,LOWER_UP> mtu 1480 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 10.244.151.128/32 scope global tunl0
       valid_lft forever preferred_lft forever
       
# 在k8s-master-02执行，此时没有VIP的IP
[root@k8s-master-02 keepalived]# ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.18.12/24 brd 192.168.18.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
```

### 15.4 测试VIP漂移

当前VIP是在k8s-master-01上，如果k8s-master-01上haproxy停止，理论上VIP会到k8s-master-02上

```shell
# k8s-master-01当前IP打印
[root@k8s-master-01 keepalived]# ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.18.11/24 brd 192.168.18.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
    inet 192.168.18.10/24 scope global secondary ens33
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
4: tunl0@NONE: <NOARP,UP,LOWER_UP> mtu 1480 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 10.244.151.128/32 scope global tunl0
       valid_lft forever preferred_lft forever

# k8s-master-02当前IP打印
[root@k8s-master-02 keepalived]# ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.18.12/24 brd 192.168.18.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever

# 在k8s-master-01停止haproxy
systemctl stop haproxy

# 停止后的k8s-master-01
[root@k8s-master-01 keepalived]# ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.18.11/24 brd 192.168.18.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
4: tunl0@NONE: <NOARP,UP,LOWER_UP> mtu 1480 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 10.244.151.128/32 scope global tunl0
       valid_lft forever preferred_lft forever
# k8s-master-02当前IP打印
[root@k8s-master-02 keepalived]# ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.18.12/24 brd 192.168.18.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
    inet 192.168.18.10/24 scope global secondary ens33
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
       
### 此时VIP已经漂移到k8s-master-02上

# 再启动k8s-master-01的haproxy
systemctl start haproxy

# 再进行查看k8s-master-01的IP打印
[root@k8s-master-01 keepalived]# ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.18.11/24 brd 192.168.18.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
    inet 192.168.18.10/24 scope global secondary ens33
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
4: tunl0@NONE: <NOARP,UP,LOWER_UP> mtu 1480 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 10.244.151.128/32 scope global tunl0
       valid_lft forever preferred_lft forever
       
# 再进行查看k8s-master-02的IP打印
[root@k8s-master-02 keepalived]# ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.18.12/24 brd 192.168.18.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default 
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever

### 此时VIP又漂移回去了，在配置keepalived.conf时，master的权重是100，node的权重是90，所以重新选举时以权重高的为准
```

* 使用tcpdump查看详细情况

安装`yum install tcpdump`

```shell
# 从打印的信息来看，可见192.168.18.11 > 224.0.0.18：代表192.168.18.11生效
[root@k8s-master-01 keepalived]# tcpdump -i any -nn vrrp
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
22:39:04.077648 IP 192.168.18.11 > 224.0.0.18: VRRPv2, Advertisement, vrid 100, prio 100, authtype simple, intvl 1s, length 20
22:39:05.078891 IP 192.168.18.11 > 224.0.0.18: VRRPv2, Advertisement, vrid 100, prio 100, authtype simple, intvl 1s, length 20
22:39:06.079609 IP 192.168.18.11 > 224.0.0.18: VRRPv2, Advertisement, vrid 100, prio 100, authtype simple, intvl 1s, length 20
22:39:07.080922 IP 192.168.18.11 > 224.0.0.18: VRRPv2, Advertisement, vrid 100, prio 100, authtype simple, intvl 1s, length 20
22:39:08.081409 IP 192.168.18.11 > 224.0.0.18: VRRPv2, Advertisement, vrid 100, prio 100, authtype simple, intvl 1s, length 20
```

### 15.5 kube-apiserver高可用

* 修改所有指向kube-apiserver的指向到VIP（k8s-master-01执行）

```shell
for i in {11..14};do ssh 192.168.18.$i "sed -i 's#192.168.18.11:6443#192.168.18.10:8443#g' /opt/kubernetes/cfg/bootstrap.kubeconfig"; done

for i in {11..14};do ssh 192.168.18.$i "sed -i 's#192.168.18.11:6443#192.168.18.10:8443#g' /opt/kubernetes/cfg/kubelet.kubeconfig"; done

for i in {11..14};do ssh 192.168.18.$i "sed -i 's#192.168.18.11:6443#192.168.18.10:8443#g' /opt/kubernetes/cfg/kube-proxy.kubeconfig"; done

for i in {11..14};do ssh 192.168.18.$i "sed -i 's#192.168.18.11:6443#192.168.18.10:8443#g'  /root/.kube/config"; done
```

* 重启服务（k8s-master-01执行）

```shell
for i in {11..14}; do ssh 192.168.18.$i "systemctl restart kubelet kube-proxy"; done
```

* 查看集群和pod运行状态

```shell
[root@k8s-master-01 keepalived]# kubectl get node
NAME            STATUS   ROLES    AGE    VERSION
k8s-master-01   Ready    <none>   4d1h   v1.20.15
k8s-master-02   Ready    <none>   4d     v1.20.15
k8s-node-01     Ready    <none>   4d8h   v1.20.15
k8s-node-02     Ready    <none>   4d8h   v1.20.15
[root@k8s-master-01 keepalived]# kubectl get pod -A
NAMESPACE     NAME                                      READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-59445c789-xgkcf   1/1     Running   1          9h
kube-system   calico-node-4rlbk                         1/1     Running   0          9h
kube-system   calico-node-6t57d                         1/1     Running   0          9h
kube-system   calico-node-djb5n                         1/1     Running   0          9h
kube-system   calico-node-lg8dp                         1/1     Running   0          9h
kube-system   coredns-76f5d77d78-cs8gk                  1/1     Running   0          8h
kube-system   coredns-76f5d77d78-t7ccx                  1/1     Running   0          8h
```

* 在浏览器中访问 VIP:1080/stats

默认账号密码是：admin/admin

![image-20220815230641440](https://file.iamwx.cn/images/202208152306588.png)

在下方的kube-apiserver中可看到k8s-master1和k8s-master2两个

* 验证

在k8s-master-01上关闭kube-apiserver

```shell
systemctl stop kube-apiserver
```

在k8s-master-01上查看节点状态

```shell
[root@k8s-master-01 keepalived]# kubectl get node
NAME            STATUS   ROLES    AGE    VERSION
k8s-master-01   Ready    <none>   4d2h   v1.20.15
k8s-master-02   Ready    <none>   4d1h   v1.20.15
k8s-node-01     Ready    <none>   4d8h   v1.20.15
k8s-node-02     Ready    <none>   4d8h   v1.20.15

### 此时可正常获取，因为请求到的是VIP
```

此时在haproxy页面中可看到k8s-master1已经变成红色，即为不可用

![image-20220815231320091](https://file.iamwx.cn/images/202208152313221.png)

再启动k8s-master-01的kube-apiserver

```shell
systemctl start kube-apiserver
```

此时已经变正常

![image-20220815231512152](https://file.iamwx.cn/images/202208152315274.png)

## 16、Metrics-server安装

### 16.1 下载yaml文件（k8s-master-01执行）

```shell
wget https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.4.1/components.yaml
```

### 16.2 修改文件

```shell
spec:
  containers:
  - args:
    - --cert-dir=/tmp
    - --secure-port=4443
    # 删掉 ExternalIP,Hostname这两个，这里已经改好了
    - --kubelet-preferred-address-types=InternalIP
    - --kubelet-use-node-status-port
    # 加上该启动参数
    - --kubelet-insecure-tls
    # 镜像地址修改为国内
    image: registry.cn-beijing.aliyuncs.com/dotbalo/metrics-server:v0.4.1
    imagePullPolicy: IfNotPresent
```

### 16.3 启动

```shell
kubectl apply -f components.yaml

# 查看是否运行成功
[root@k8s-master-01 ~]# kubectl get pod -n kube-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-5b9665f764-g5b5x   1/1     Running   3          6d17h
calico-node-2md9s                          1/1     Running   1          6d17h
calico-node-bqtjp                          1/1     Running   2          6d17h
calico-node-lgml8                          1/1     Running   2          6d17h
coredns-79495b5589-fb2f7                   1/1     Running   1          6d17h
metrics-server-64996ddc6d-rl9pw            1/1     Running   0          20s
```

### 16.4 验证

```shell
# 查看api server是否可以连通Metrics Server
[root@k8s-master-01 ~]# kubectl describe svc metrics-server -n kube-system
Name:              metrics-server
Namespace:         kube-system
Labels:            k8s-app=metrics-server
Annotations:       <none>
Selector:          k8s-app=metrics-server
Type:              ClusterIP
IP Families:       <none>
IP:                10.0.217.214
IPs:               10.0.217.214
Port:              https  443/TCP
TargetPort:        https/TCP
Endpoints:         10.244.44.214:4443
Session Affinity:  None
Events:            <none>

# 在其他几个节点ping一下Endpoints的地址
[root@k8s-master-01 ~]# ping 10.244.44.214
PING 10.244.44.214 (10.244.44.214) 56(84) bytes of data.
64 bytes from 10.244.44.214: icmp_seq=1 ttl=63 time=0.242 ms
64 bytes from 10.244.44.214: icmp_seq=2 ttl=63 time=0.157 ms
^C
--- 10.244.44.214 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1000ms
rtt min/avg/max/mdev = 0.157/0.199/0.242/0.044 ms
```

### 16.5 查看节点、pod内存、CPU使用率

```shell
[root@k8s-master-01 ~]# kubectl top node
NAME            CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%   
k8s-master-01   134m         6%     1169Mi          68%       
k8s-node-01     101m         5%     987Mi           57%       
k8s-node-02     102m         5%     1019Mi          59%     

[root@k8s-master-01 ~]# kubectl top pod -A
NAMESPACE     NAME                                       CPU(cores)   MEMORY(bytes)   
kube-system   calico-kube-controllers-5b9665f764-g5b5x   2m           31Mi            
kube-system   calico-node-2md9s                          20m          108Mi           
kube-system   calico-node-bqtjp                          24m          98Mi            
kube-system   calico-node-lgml8                          21m          106Mi           
kube-system   coredns-79495b5589-fb2f7                   2m           24Mi            
kube-system   metrics-server-64996ddc6d-rl9pw            2m           14Mi
```

## 17、Dashboard安装

### 17.1 下载yaml

```shell
# 官网：wget https://raw.githubusercontent.com/kubernetes/dashboard/v2.4.0/aio/deploy/recommended.yaml
wget https://file.iamwx.cn/linux/k8s/doshboard.yaml
```

### 17.2 执行

```shell
kubectl apply -f recommended.yaml
```

### 17.3 修改svc配置

dashboard启动后可查看svc是ClusterIP，此时无法通过IP端口访问

```shell
[root@k8s-master-01 ~]# kubectl get svc kubernetes-dashboard -n kubernetes-dashboard
NAME                   TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
kubernetes-dashboard   ClusterIP   10.0.190.103   <none>        443/TCP   14m
# 编辑svc
[root@k8s-master-01 ~]# kubectl edit svc kubernetes-dashboard -n kubernetes-dashboard
#### 输入上述命令后，进入到编辑文件页面，把 ClusterIP修改为NodePort，保存退出
service/kubernetes-dashboard edited
# 再查看此时是NodePort且有对外端口暴露出来
[root@k8s-master-01 ~]# kubectl get svc kubernetes-dashboard -n kubernetes-dashboard
NAME                   TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)         AGE
kubernetes-dashboard   NodePort   10.0.190.103   <none>        443:31813/TCP   15m
```

### 17.4 访问

此时通过 http://IP:PORT 访问 dashboard 会提示如下内容

![image-20220901092220650](https://file.iamwx.cn/images/202209010922944.png)

需要使用https访问，此时会提示不安全，点击高级-继续访问即可，会出现下图内容

![image-20220901092315782](https://file.iamwx.cn/images/202209010923915.png)

使用Token方式登录，需要创建一个管理员，获取登录token

* 创建auth.yaml

```shell
vi auth.yaml

# 粘贴以下内容
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: dashboard-admin
subjects:
  - kind: ServiceAccount
    name: admin-user
    namespace: kubernetes-dashboard
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
  
# 执行文件
kubectl apply -f auth.yaml
```

* 获取token

```shell
[root@k8s-master-01 ~]# kubectl -n kubernetes-dashboard describe secret $(kubectl -n kubernetes-dashboard get secret | grep admin-user | awk '{print $1}')
Name:         admin-user-token-bvsmf
Namespace:    kubernetes-dashboard
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: admin-user
              kubernetes.io/service-account.uid: e7289c0e-7e1a-421f-bbef-575530a83399

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1375 bytes
namespace:  20 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6IjFtZUFJZmVWc0tpNDRsREhSejVNd2RrQkZEUjJSWkduNWVvZ0R2TnY3bTQifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlcm5ldGVzLWRhc2hib2FyZCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJhZG1pbi11c2VyLXRva2VuLWJ2c21mIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImFkbWluLXVzZXIiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiJlNzI4OWMwZS03ZTFhLTQyMWYtYmJlZi01NzU1MzBhODMzOTkiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZXJuZXRlcy1kYXNoYm9hcmQ6YWRtaW4tdXNlciJ9.IUm_UPuxVujR0_-x9PQuts4B0rjs9pN2Bz6WlknWA2B28w3WwjnLQx_ZXoAbor5ACap-iq_EOS79yM6Xjj2GuBpP2wDxoOCg4bGzvmcHxyVpMd-gAd-xLQuMnXOnvB5KthMSyh86lFQdZXm-aOt6AVKBVS2Cca9wT-p8zRvF70CuYyFY9A9x7cB7zFbLZzT5FMF-JhvmJEP_mRZUOvpOKYvsj-1GyusmevYWoKXjAJA1MJ3cdezKFOKuF3NxPAhmWjmsEM2oaJUq1Evqd524kqej_fRzgGFLJ7cUNWcJT-XRXgUHo-3N29aGnu5TmyQ-VUJBpTbvAbgQrDuZp50wvQ
```

* 访问

将上步骤打印出的token值复制，到浏览器访问 https://ip:port，选择token登录即可进入

![image-20220901093814564](https://file.iamwx.cn/images/202209010938695.png)