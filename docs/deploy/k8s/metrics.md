# Metrics-server安装

### 1 下载yaml文件（k8s-master-01执行）

```shell
wget https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.4.1/components.yaml
```

### 2 修改文件

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

### 3 启动

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

### 4 验证

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

### 5 查看节点、pod内存、CPU使用率

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