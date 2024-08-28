# 清理docker的overlay2文件夹

* 查看当前内存占用情况

> /var/lib/docker/overlay2 目前的占用情况都是100%

```shell
[root@hanshang ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
devtmpfs        7.5G     0  7.5G   0% /dev
tmpfs           7.6G  122M  7.4G   2% /dev/shm
tmpfs           7.6G   19M  7.5G   1% /run
tmpfs           7.6G     0  7.6G   0% /sys/fs/cgroup
/dev/vda1        99G   96G     0 100% /
overlay          99G   96G     0 100% /var/lib/docker/overlay2/0d7c9457401eb641939a0dd4500788881d11a132927a09fb60ba4349f6e9c7a7/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/51c94611b799eba6ae1e1f25443b4c918e9b12ea281d2bd80caf5a3ed1cf740b/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/e8dd3c11b0ffd183beafbd3c2e8cf35f24e72950687496a9f1e78e478456efc5/merged
tmpfs           1.6G     0  1.6G   0% /run/user/0
overlay          99G   96G     0 100% /var/lib/docker/overlay2/a425de0d03b30e4add4b45b5ed1076e291045c2cd1e43fc05f21f831133c5556/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/63e5ad5bc1cdef3cfcd536b25f208d9b0354694c5920cb545c5fdee8e8eb0a94/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/668f8235d803b22c4a0959eb1d5083d50a64fdf80569a0f6eee42e0becc8d4b2/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/b46a20399e82fc09204f808d81911fac99dd7ba7781dd9174315213b669bbd21/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/97a5d5b190328a906950bbdbcb1982a0c2e30c4ea323b7c923bf306e1577c8f0/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/88c1ae43a46fb29a3947ec82aba04cfb56afc6ad30e569cbde03efb854152f08/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/03d1cf1d7c9985aaaf43b8bce081cd1e5d39b9bef6f11826bfd1919fa6d08d64/merged
overlay          99G   96G     0 100% /var/lib/docker/overlay2/a774595d153945c45df1276701097757c902725d0ba0d2c32e6752b631dc9542/merged
[root@hanshang ~]# ls
```

* 创建脚本

```shell
#!/bin/bash
echo "======== start clean docker containers logs ========"
logs=$(find /var/lib/docker/containers/ -name *-json.log`)
for log in $logs
        do
                echo "clean logs : $log"
                cat /dev/null > $log
        done
echo "======== end clean docker containers logs ========"
```

* 执行脚本
* 再次查看内存占用情况

> 现在的使用率已降到51%

```shell
[root@hanshang 4f21682be6d6a4f10ebcc6e94840c61896d2218ddf41316d02a9ec4bb7c6ac40]# cd /
[root@hanshang /]# df -h
Filesystem      Size  Used Avail Use% Mounted on
devtmpfs        7.5G     0  7.5G   0% /dev
tmpfs           7.6G  123M  7.4G   2% /dev/shm
tmpfs           7.6G   19M  7.5G   1% /run
tmpfs           7.6G     0  7.6G   0% /sys/fs/cgroup
/dev/vda1        99G   48G   47G  51% /
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/0d7c9457401eb641939a0dd4500788881d11a132927a09fb60ba4349f6e9c7a7/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/51c94611b799eba6ae1e1f25443b4c918e9b12ea281d2bd80caf5a3ed1cf740b/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/e8dd3c11b0ffd183beafbd3c2e8cf35f24e72950687496a9f1e78e478456efc5/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/a425de0d03b30e4add4b45b5ed1076e291045c2cd1e43fc05f21f831133c5556/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/63e5ad5bc1cdef3cfcd536b25f208d9b0354694c5920cb545c5fdee8e8eb0a94/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/668f8235d803b22c4a0959eb1d5083d50a64fdf80569a0f6eee42e0becc8d4b2/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/b46a20399e82fc09204f808d81911fac99dd7ba7781dd9174315213b669bbd21/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/97a5d5b190328a906950bbdbcb1982a0c2e30c4ea323b7c923bf306e1577c8f0/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/88c1ae43a46fb29a3947ec82aba04cfb56afc6ad30e569cbde03efb854152f08/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/03d1cf1d7c9985aaaf43b8bce081cd1e5d39b9bef6f11826bfd1919fa6d08d64/merged
overlay          99G   48G   47G  51% /var/lib/docker/overlay2/a774595d153945c45df1276701097757c902725d0ba0d2c32e6752b631dc9542/merged
tmpfs           1.6G     0  1.6G   0% /run/user/0
```

